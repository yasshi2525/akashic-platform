import { NextApiRequest, NextApiResponse } from "next";

const serverUrl = "http://localhost:3032";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const baseUrl = `http://${req.headers["host"]}`;
    const contentId = req.query.id;
    return new Promise<void>((resolve, reject) => {
        fetch(`${serverUrl}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                configurationUrl: `${baseUrl}/content/${contentId}/game.json`,
                assetBaseUrl: `${baseUrl}/content/${contentId}`,
                contentUrl: `${baseUrl}/api/content/${contentId}`,
            }),
        })
            .then((serverRes) => {
                if (serverRes.status === 200) {
                    serverRes.json().then((json) => {
                        res.status(200).json(json);
                        resolve();
                    });
                } else {
                    serverRes.text().then((err) => {
                        res.status(500).send(err);
                        reject();
                    });
                }
            })
            .catch((err) => {
                res.status(500).send((err as Error).message);
                reject();
            });
    });
}
