import * as sha256 from 'crypto-js/sha256';
import * as secp256k1 from 'secp256k1';
import { KeyPair } from './keyUtils';
import { StdTxValue, Signature } from './msgUtils';

// Transactions often have amino decoded objects in them {type, value}.
// We need to strip this clutter as we need to sign only the values.
function prepareSignBytes(jsonTx:any):any {
  if (Array.isArray(jsonTx)) {
      return jsonTx.map(prepareSignBytes);
  }

  // string or number
  if (typeof jsonTx !== `object`) {
      return jsonTx;
  }

  const sorted = {};
  Object.keys(jsonTx)
      .sort()
      .forEach(key => {
          if (jsonTx[key] === undefined || jsonTx[key] === null) return;

          sorted[key] = prepareSignBytes(jsonTx[key]);
      });
  return sorted;
}

export interface SignMetaData {
  sequence: string,
  account_number: string,
  chain_id: string
}

/*
The SDK expects a certain message format to serialize and then sign.
type StdSignMsg struct {
  ChainID       string      `json:"chain_id"`
  AccountNumber uint64      `json:"account_number"`
  Sequence      uint64      `json:"sequence"`
  Fee           auth.StdFee `json:"fee"`
  Msgs          []sdk.Msg   `json:"msgs"`
  Memo          string      `json:"memo"`
}
*/
/* eslint-disable @typescript-eslint/camelcase */
function createSignMessage(
  tx: StdTxValue, { sequence, account_number, chain_id }: SignMetaData) {
  // sign bytes need amount to be an array
  const fee = {
      amount: tx.fee.amount || [],
      gas: tx.fee.gas,
  };

  return JSON.stringify(
      prepareSignBytes({
          fee,
          memo: tx.memo,
          msgs: tx.msg, // weird msg vs. msgs
          sequence,
          account_number,
          chain_id,
      }),
  );
}

// produces the signature for a message (returns Buffer)
function signWithPrivateKey(signMessage, privateKey) {
  const signHash = Buffer.from(sha256(signMessage).toString(), `hex`);
  const { signature } = secp256k1.sign(signHash, Buffer.from(privateKey, `hex`));
  return signature;
}

function createSignature(
  signature: Buffer, 
  sequence: string, 
  account_number: string, 
  publicKey: Buffer): Signature {
  return {
      signature: signature.toString(`base64`),
      account_number,
      sequence,
      pub_key: {
          type: `tendermint/PubKeySecp256k1`, // TODO: allow other keytypes
          value: publicKey.toString(`base64`),
      },
  };
}

// main function to sign a jsonTx using the local keystore wallet
// returns the complete signature object to add to the tx
export function sign(
  jsonTx:any, 
  keyPair: KeyPair, 
  requestMetaData: SignMetaData): Signature {
  const { sequence, account_number } = requestMetaData;
  const signMessage = createSignMessage(jsonTx, requestMetaData);
  const signatureBuffer = signWithPrivateKey(signMessage, keyPair.privateKey);
  return createSignature(signatureBuffer, sequence, account_number, keyPair.publicKey);
}

// adds the signature object to the tx
export function createSignedTx(tx: StdTxValue, signature: Signature): StdTxValue {
  return Object.assign({}, tx, {
      signatures: [signature],
  });
}

// the broadcast body consists of the signed tx and a return type
// returnType can be block (inclusion in block), async (right away), sync (after checkTx has passed)
export function createBroadcastBody(signedTx: StdTxValue, modeType = `block`): string {
  return JSON.stringify({
      tx: signedTx,
      mode: modeType,
  });
}