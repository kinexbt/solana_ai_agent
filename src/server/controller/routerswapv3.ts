import { ethers } from "ethers";
import { Token, Percent } from "@pancakeswap/sdk";
import { FeeAmount, Pool, v3PoolAbi, quoterV2ABI, swapRouterABI } from "@pancakeswap/v3-sdk";

import {
    chainId,
    PANCAKE_QUOTER_ADDRESS,
    PANCAKE_V3_FACTORY_ADDRESS,
    PANCAKE_V3_SWAPROUTER_ADDRESS,
    RPC_ENDPOINT,
    w3,
    WBNB_ADDRESS
} from "../constant";
import { getDecimal, getTokenSymbol, tokenApprove } from "./tokenContract"
import { get_PANCAKE_QUOTER_abi, get_PANCAKE_V3_FACTORY_abi, get_PANCAKE_V3_ROUTER_abi } from "../utils";
import { signer, provider } from "../main";

const factoryV3ABI = get_PANCAKE_V3_FACTORY_abi();
const routerV3ABI = get_PANCAKE_V3_ROUTER_abi();
const quoterABI = get_PANCAKE_QUOTER_abi();

export const simpleSwap = async (slippage: number, inputAmount: string, tokenIn: string, tokenOut: string) => {
    const decimal0 = await getDecimal(tokenIn);
    const symbol0 = await getTokenSymbol(tokenIn);
    const decimal1 = await getDecimal(tokenOut);
    const symbol1 = await getTokenSymbol(tokenOut);

    const token0: Token = new Token(chainId, `0x${tokenIn.slice(2)}`, decimal0, symbol0);
    const token1: Token = new Token(chainId, `0x${tokenOut.slice(2)}`, decimal1, symbol1);

    const pool = await getPool(token0, token1);
    const quoterCONTRACT = new ethers.Contract(PANCAKE_QUOTER_ADDRESS, quoterABI, signer);
    const [amountOutWei] = await quoterCONTRACT.quoteExactInputSingle({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: inputAmount,
        fee: pool.fee,
        sqrtPriceLimitX96: 0,
    });

    if (amountOutWei === 0n) {
        throw new Error("Zero output amount, cannot proceed with the trade.");
    }

    const slippageTolerance = new Percent(Math.floor(slippage * 100), 10_000);
    const amountOutMinimum = amountOutWei - (amountOutWei * BigInt(slippageTolerance.numerator)) / BigInt(slippageTolerance.denominator);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: pool.fee,
        recipient: signer.address,
        deadline,
        amountIn: inputAmount,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
    };

    await tokenApprove(tokenIn, PANCAKE_V3_SWAPROUTER_ADDRESS);

    const { gasPrice } = await provider.getFeeData();
    if (!gasPrice) throw new Error("Failed to retrieve gas price");

    const routerV3CONTRACT = new ethers.Contract(PANCAKE_V3_SWAPROUTER_ADDRESS, routerV3ABI, signer);
    const gasLimit = await routerV3CONTRACT.exactInputSingle.estimateGas(params);
    const tx = await routerV3CONTRACT.exactInputSingle(params, { gasLimit, gasPrice });

    await tx.wait();
    return tx.hash;
}

export const getPool = async (tokenA: Token, tokenB: Token, feeAmount = FeeAmount.MEDIUM) => {

    const factoryV3CONTRACT = new ethers.Contract(PANCAKE_V3_FACTORY_ADDRESS, factoryV3ABI, provider);
    const poolAddress = await factoryV3CONTRACT.getPool(tokenA.address, tokenB.address, feeAmount);

    if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("No pair address found for the provided token pair.");
    }

    const poolContract = new ethers.Contract(poolAddress, v3PoolAbi, provider);
    const [liquidity, { sqrtPriceX96, tick }] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

    return new Pool(tokenA, tokenB, feeAmount, BigInt(sqrtPriceX96.toString()), BigInt(liquidity.toString()), tick);
}