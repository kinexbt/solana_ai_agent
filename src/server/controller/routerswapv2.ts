import { ethers } from "ethers";

import {
    PANCAKE_V2_FACTORY_ADDRESS,
    PANCAKE_V2_SWAPROUTER_ADDRESS,
    RPC_ENDPOINT,
    w3,
    WBNB_ADDRESS
} from "../constant";
import { getAllowance, getDecimal, tokenApprove } from "./tokenContract"
import { get_PANCAKE_V2_FACTORY_abi, get_PANCAKE_V2_ROUTER_abi, get_TOKEN_abi } from "../utils";
import { owner, provider, signer } from "../main";
import { Address } from "web3";

const factoryV2ABI = get_PANCAKE_V2_FACTORY_abi();
const routerV2ABI = get_PANCAKE_V2_ROUTER_abi();

export const getExpectedAmountsOut = async (amountIn: string, tokenA: Address, tokenB: Address, slippage: number) => {
    try {
        const decimal = await getDecimal(tokenB);

        console.log('tokenA :>> ', tokenA);
        console.log('tokenB :>> ', tokenB);
        const routerV2CONTRACT = new ethers.Contract(PANCAKE_V2_SWAPROUTER_ADDRESS, routerV2ABI, provider);
        const expectedAmountOut = await routerV2CONTRACT.getAmountsOut(amountIn, [tokenA, tokenB]);

        console.log("=====================================");

        console.log('expectedAmountOut :>> ', expectedAmountOut);

        const expectedAmountOutString = expectedAmountOut[expectedAmountOut.length - 1].toString();
        const slippageAdjustedAmountOut = (BigInt(expectedAmountOutString) * BigInt((1 - slippage) * 1000000000)) / BigInt(1000000000);
        const amountOutMin = Math.floor(parseFloat(w3.utils.toWei(slippageAdjustedAmountOut.toString(), 'wei')) / 10 ** Number(decimal)) * 10 ** Number(decimal);

        return amountOutMin;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}

export const swapBuyTokenV2 = async (slippage: number, tokenAddr: string, walletAddr: string, amountIn: number) => {
    try {
        const amountInWEI = w3.utils.toWei(amountIn.toString(), 'ether');
        const deadline = Math.floor(Date.now() / 1000) + 1200;
        const amountOutMin = await getExpectedAmountsOut(amountInWEI, WBNB_ADDRESS, tokenAddr, slippage);

        const allowance = await getAllowance(tokenAddr, walletAddr);
        console.log('allowance :>> ', allowance);

        if (Number(allowance) < Number(amountInWEI)) {
            const approvedTxHash = await tokenApprove(WBNB_ADDRESS, PANCAKE_V2_SWAPROUTER_ADDRESS);

            if (!approvedTxHash) return null;
        }

        const routerV2CONTRACT = new ethers.Contract(PANCAKE_V2_SWAPROUTER_ADDRESS, routerV2ABI, signer);
        const tx = await routerV2CONTRACT.swapExactETHForTokens(
            amountOutMin,
            [
                w3.utils.toChecksumAddress(WBNB_ADDRESS),
                w3.utils.toChecksumAddress(tokenAddr),
            ],
            w3.utils.toChecksumAddress(walletAddr),
            deadline, {
            value: amountInWEI
        }
        )
        await tx.wait();

        return tx.hash;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}

export const swapSellTokenV2 = async (slippage: number, tokenAddr: string, walletAddr: string, amountIn: number) => {
    try {
        const deadline = Math.floor(Date.now() / 1000) + 1200;
        const amountOutMin = await getExpectedAmountsOut(amountIn.toString(), tokenAddr, WBNB_ADDRESS, slippage);
        const allowance = await getAllowance(tokenAddr, walletAddr);

        if (Number(allowance) < amountIn) {
            const approvedTxHash = await tokenApprove(tokenAddr, PANCAKE_V2_SWAPROUTER_ADDRESS);

            if (!approvedTxHash) return null;
        }

        const routerV2CONTRACT = new ethers.Contract(PANCAKE_V2_SWAPROUTER_ADDRESS, routerV2ABI, signer);
        const swapTx = await routerV2CONTRACT.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn,
            amountOutMin,
            [
                w3.utils.toChecksumAddress(tokenAddr),
                w3.utils.toChecksumAddress(WBNB_ADDRESS),
            ],
            walletAddr,
            deadline)

        await swapTx.wait();

        return swapTx.hash;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}