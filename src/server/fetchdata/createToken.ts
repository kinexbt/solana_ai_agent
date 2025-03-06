import axios from "axios"
import { FOUR_MEME_URL, RAISING_LIST } from "../constant"

export const getCreateTokenInfo = async (cookie: string, description: string, imgUrl: string, tag: string, tradingFee: number, tokenName: string, presale: number, tokenSymbol: string, nativeSymbol: string, tgLink?: string, xLink?: string, webLink?: string) => {
    try {
        const raisingData = RAISING_LIST.find(item => item.nativeSymbol == nativeSymbol);

        if (!raisingData) return null;

        const url = `${FOUR_MEME_URL}/v1/private/token/create`;

        const data = {
            clickFun: false,
            desc: description,
            funGroup: false,
            imgUrl,
            label: tag,
            launchTime: Date.now(),
            lpTradingFee: tradingFee,
            name: tokenName,
            preSale: presale,
            raisedAmount: raisingData.totalBAmount,
            raisedToken: raisingData,
            reserveRate: 0,
            saleRate: 0.8,
            shortName: tokenSymbol,
            symbol: nativeSymbol,
            telegramUrl: tgLink,
            totalSupply: raisingData.totalAmount,
            twitterUrl: xLink,
            webUrl: webLink,
        }

        const res = await fetch(url, {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9,ru;q=0.8",
                "content-type": "application/json",
                "meme-web-access": cookie,
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "cookie": `meme-web-access=${cookie}; user_token=${cookie}`,
                "Referer": "https://four.meme/create-token",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify(data),
            method: "POST"
        })

        if (!res.ok) {
            throw new Error("error");
        }

        const payload: any = await res.json();

        console.log('payload.data :>> ', payload.data);
        if (payload.msg == "success") return payload.data;
        else return null;
    } catch (error: any) {
        throw new Error(error)
    }
}