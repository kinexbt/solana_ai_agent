import { ethers } from "ethers";

import {
    RPC_ENDPOINT,
    TOKEN_MANAGER_CONTRACT_V2_ADDRESS
} from "../constant";
import { get_TOKENMANAGER_V2_abi } from "../utils";
import { signer } from "../main";

export const signCreateTokenTx = async (code: any, poolsCode: any, owner: string) => {
    try {
        const tokenManagerV2ABI = get_TOKENMANAGER_V2_abi();
        const contract = new ethers.Contract(TOKEN_MANAGER_CONTRACT_V2_ADDRESS, tokenManagerV2ABI, signer);

        const tx = await contract.createToken(code, poolsCode);

        await tx.wait();

        return tx.hash;
    } catch (error: any) {
        console.log('error :>> ', error);
        throw new Error(error)
    }
}