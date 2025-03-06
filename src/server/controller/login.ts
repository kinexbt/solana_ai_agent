import * as Router from "../routes"
import { signMsg } from "../utils";
import { w3 } from "../constant";

export const login = async (owner: string) => {
    const wallet = w3.eth.accounts.privateKeyToAccount(owner);
    const pubkey = wallet.address;

    const nonce = await Router.generateNonce(pubkey);

    const msg = `You are sign in Meme ${nonce}`;
    const signature = await signMsg(msg, owner);

    if (signature) {
        const cookieInfo = await Router.loginDex(pubkey, signature);

        return cookieInfo;
    } else {
        console.log("Need to check four.meme api again✔✔✔");
        return null;
    }
}