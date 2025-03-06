import { ethers } from 'ethers';

import * as Controller from '../controller';
import * as Router from '../fetchdata';
import {
  OWNER,
  RANDOM_NUM,
  RPC_ENDPOINT,
  WBNB_ADDRESS,
} from '../utils/constant';
import { decrypt, getTokenInfo } from '../utils/utils';

// Initialize provider, signer, and owner
export const owner = decrypt(OWNER, RANDOM_NUM);
export const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT);
export const signer = new ethers.Wallet(owner, provider);

//========================================================================//
//========================= CONFIGURATION ===============================//
//========================================================================//

const TOKEN_CONFIG = {
  imgUrl:
    'https://static.four.meme/market/425b1083-eaba-40a3-b50a-498952c804d510617906659536068632.png',
  description: 'It',
  tag: 'AI',
  name: 'random',
  symbol: 'CAKE',
  nativeSymbol: 'BNB',
  tradingFee: 0.01,
  presale: 0,
};

const tokenLaunch = async () => {
  try {
    const cookie = await Controller.login(owner);
    if (!cookie) throw new Error('Login failed. Cookie not received.');

    const { tokenId, signature, createArg } = await Router.getCreateTokenInfo(
      cookie,
      TOKEN_CONFIG.description,
      TOKEN_CONFIG.imgUrl,
      TOKEN_CONFIG.tag,
      TOKEN_CONFIG.tradingFee,
      TOKEN_CONFIG.name,
      TOKEN_CONFIG.presale,
      TOKEN_CONFIG.symbol,
      TOKEN_CONFIG.nativeSymbol,
    );

    if (!signature || !tokenId)
      throw new Error('Token creation signature or ID missing.');

    const signedTxHash = await Controller.signCreateTokenTx(
      createArg,
      signature,
      owner,
    );
    if (!signedTxHash) throw new Error('Transaction signing failed.');

    // const tokenAddress = await Router.getInfoById(tokenId, cookie);
    // console.log("Token Launched:", `https://four.meme/token/${tokenAddress}`);
  } catch (error) {
    console.error('[Error] tokenLaunch:', error);
  }
};

//========================================================================//
//========================= EXECUTE FUNCTIONS ============================//
//========================================================================//
