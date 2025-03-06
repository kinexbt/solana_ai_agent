import axios from "axios"
import { FOUR_MEME_URL } from "../constant"

export const getInfoById = async (id: string, cookie: string) => {
    try {
        const url = `${FOUR_MEME_URL}/v1/private/token/getById?id=${id}`

        while (1) {
            const res = await fetch(url, {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9,ru;q=0.8",
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
                "body": null,
                "method": "GET"
            });

            if (!res.ok) {
                throw new Error("error");
            }

            const payload: any = await res.json();
            if (payload.msg == "success" && payload.data.address) return payload.data.address;
            else await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    } catch (error: any) {
        throw new Error(error)
    }
}