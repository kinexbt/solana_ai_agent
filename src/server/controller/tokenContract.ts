import { ethers } from "ethers";

import { get_TOKEN_abi } from "../utils";
import { PANCAKE_V2_SWAPROUTER_ADDRESS, RPC_ENDPOINT } from "../constant";
import { owner, provider, signer } from "../main";

const tokenABI = get_TOKEN_abi();

export const getDecimal = async (tokenAddr: string) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddr, tokenABI, provider);
        const decimal = await tokenContract.decimals();

        return decimal;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}

export const getAllowance = async (tokenAddr: string, walletAddr: string) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddr, tokenABI, signer);
        const allowance = await tokenContract.allowance(walletAddr, PANCAKE_V2_SWAPROUTER_ADDRESS);

        return allowance;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}

export const tokenApprove = async (tokenAddr: string, routerAddr: string) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddr, tokenABI, signer);

        const approveAmount = 1000000000000000000000000;

        console.log('approveAmount :>> ', approveAmount);
        const approveTx = await tokenContract.approve(routerAddr, approveAmount);

        console.log('approveTx :>> ', approveTx);

        await approveTx.wait();

        console.log('approveTx.hash :>> ', approveTx.hash);

        return approveTx.hash;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}

export const getTokenSymbol = async (tokenAddr: string) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddr, tokenABI, provider);
        const tokenSymbol = await tokenContract.symbol();

        return tokenSymbol;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}
