import * as SHA256 from 'crypto-js/sha256'


export interface Coin {
  denom: string
  amount: string
}

export interface Fee {
  gas: string
  amount: Array<Coin>
}

export interface InOut {
  address: string
  coins: Array<Coin>
}

export interface Signature {
  signature: string
  account_number: string
  sequence: string
  pub_key: {
    type: string
    value: string
  }
}

function normalizeDecimal (
  decimalNumber: string
): string {
  const num = decimalNumber.split('.')
  let result = decimalNumber

  if (num.length === 1) {
    result += '000000000000000000'
  } else {
    const decimalPart = num[1]

    for (let i = 18; i > decimalPart.length; i -= 1) {
      result += '0'
    }
  }

  return result
}

export function generateVoteHash (
  salt: string,
  price: string,
  denom: string,
  voter: string
): string {
  const proof = `${salt}:${normalizeDecimal(price)}:${denom}:${voter}`
  const hash = SHA256(proof).toString() // hex string

  return hash.slice(0, 40) // 20 prefix bytes
}

export interface StdTxValue {
  fee: Fee
  memo: string
  msg: Array<object>
  signatures: Array<Signature>
}
export interface StdTx {
  type: string
  value: StdTxValue
}

export function buildStdTx (
  msg: Array<object>, 
  fee: Fee, 
  memo: string
): StdTx {
  return {
    type: 'auth/StdTx',
    value: {
      fee,
      memo,
      msg,
      signatures: []
    }
  }
}

interface MsgPricePrevote {
  type: string,
  value: {
    hash: string,
    denom: string,
    feeder: string,
    validator: string
  }
}

export function buildPricePrevoteMsg (
  hash: string, 
  denom: string, 
  feeder: string, 
  validator: string
): MsgPricePrevote {
  return {
    type: 'oracle/MsgPricePrevote',
    value: {
      hash,
      denom,
      feeder,
      validator
    }
  }
}

interface MsgPriceVote {
  type: string,
  value: {
    price: string,
    salt: string,
    denom: string,
    feeder: string,
    validator: string
  }
}

export function buildPriceVote (
  price: string, 
  salt: string, 
  denom: string, 
  feeder: string, 
  validator: string
): MsgPriceVote {
  return {
    type: 'oracle/MsgPriceVote',
    value: {
      price,
      salt,
      denom,
      feeder,
      validator
    }
  }
}
interface MsgSend {
  type: string,
  value: {
    amount: Array<Coin>,
    from_address: string,
    to_address: string,
  }
}

export function buildSend(
  amount: Array<Coin>, 
  fromAddress: string, 
  toAddress: string
):MsgSend {
  return {
    type: 'pay/MsgSend',
    value: {
      amount: amount,
      from_address: fromAddress,
      to_address: toAddress
    }
  }
}

interface MsgMultiSend {
  type: string,
  value: {
    inputs: Array<InOut>,
    outputs: Array<InOut>
  }
}

export function buildMultiSend(
  inputs: Array<InOut>, 
  outputs: Array<InOut>
): MsgMultiSend {
  return {
    type: 'pay/MsgMultiSend',
    value: {
      inputs,
      outputs
    }
  }
}
