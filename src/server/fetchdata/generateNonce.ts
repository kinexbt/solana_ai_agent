import axios from "axios"

import { FOUR_MEME_URL } from "../constant";

export const generateNonce = async (address: string) => {
    try {
        const url = `${FOUR_MEME_URL}/v1/private/user/nonce/generate`;

        const res = await axios.post(
            url, {
            accountAddress: address,
            networkCode: "BSC",
            verifyType: "LOGIN"
        })

        const payload = await res.data;

        if (payload.msg == "success") return payload.data;
        else return null;
    } catch (error: any) {
        throw new Error(error)
    }
}