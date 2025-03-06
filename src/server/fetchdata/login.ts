import axios from "axios"

import { FOUR_MEME_URL } from "../constant";

export const loginDex = async (address: string, signature: string) => {
    try {
        const url = `${FOUR_MEME_URL}/v1/private/user/login/dex`;

        const res = await axios.post(
            url, {
            inviteCode: "",
            langType: "EN",
            loginIp: "",
            region: "WEB",
            verifyInfo: {
                address: address,
                networkCode: "BSC",
                signature: signature,
                verifyType: "LOGIN"
            },
            walletName: "MetaMask"
        }
        )

        const payload = await res.data;

        if (payload.msg == "success") return payload.data;
        else return null;
    } catch (error: any) {
        throw new Error(error);
    }
}