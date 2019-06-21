import * as HEX from 'crypto-js/enc-hex'
import * as RIPEMD160 from 'crypto-js/ripemd160'
import * as SHA256 from 'crypto-js/sha256'

import * as bip32 from 'bip32'
import * as bip39 from 'bip39'
import * as bech32 from 'bech32'

import * as secp256k1 from 'secp256k1'

const accPrefix = `terra`
const valPrefix = `terravaloper`

export async function deriveMasterKey (
  mnemonic: string
): Promise<bip32.BIP32Interface> {
  // throws if mnemonic is invalid
  bip39.validateMnemonic(mnemonic)

  const seed = await bip39.mnemonicToSeed(mnemonic)
  return bip32.fromSeed(seed)
}

export interface KeyPair {
  privateKey: Buffer,
  publicKey: Buffer
}

export function deriveKeypair (
  masterKey: bip32.BIP32Interface,
  account: Number = 0,
  index: Number = 0,
): KeyPair {
  const hdPathLuna = `m/44'/330'/${account}'/0/${index}`
  const terraHD = masterKey.derivePath(hdPathLuna)
  const privateKey = terraHD.privateKey
  const publicKey = secp256k1.publicKeyCreate(privateKey, true);

  if (!privateKey) {
    throw "Failed to derive key pair";
  }

  return {
    privateKey,
    publicKey
  }
}

// NOTE: this only works with a compressed public key (33 bytes)
function getAddress (
  publicKey: Buffer
): Buffer {
  const message = HEX.parse(publicKey.toString(`hex`))
  const hash = RIPEMD160(SHA256(message)).toString()
  const address = Buffer.from(hash, `hex`)
  return bech32.toWords(address)
}

// NOTE: this only works with a compressed public key (33 bytes)
export function getAccAddress (
  publicKey: Buffer
): string {
  const words = getAddress(publicKey)
  return bech32.encode(accPrefix, words)
}

// NOTE: this only works with a compressed public key (33 bytes)
export function getValAddress (
  publicKey: Buffer
): string {
  const words = getAddress(publicKey)
  return bech32.encode(valPrefix, words)
}

export function convertValAddressToAccAddress (
  address: string
): string {
  const { words } = bech32.decode(address)
  return bech32.encode(accPrefix, words)
}

export function convertAccAddressToValAddress (
  address: string
): string {
  const { words } = bech32.decode(address)
  return bech32.encode(valPrefix, words)
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic(256)
}