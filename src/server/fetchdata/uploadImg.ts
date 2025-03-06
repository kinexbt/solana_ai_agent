import { FOUR_MEME_URL } from "../constant"

export const uploadImg = async (imgContext: string, cookie: string) => {
    try {
        const url = `${FOUR_MEME_URL}/v1/private/token/upload`

        const response = await fetch(url, {
            "headers": {
              "accept": "application/json, text/plain, */*",
              "accept-language": "en-US,en;q=0.9,ru;q=0.8",
              "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryo1V1pbqnyqbUgkiY",
              "meme-web-access": `${cookie}`,
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
            "body":imgContext,
            "method": "POST"
          });

          if (!response.ok) {
            throw new Error("error");
        }

        const payload: any = await response.json();

        console.log('payload :>> ', payload);

        if (payload.msg == "success") return payload.data;
        else return null;
    } catch (error: any) {
        throw new Error(error)
    }
}