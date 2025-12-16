// app/api/pin/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

const PINATA_URL_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_URL_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";

function getPinataHeaders(extraHeaders: Record<string,string> = {}) {
  const key = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET;
  if (!key || !secret) throw new Error("Missing PINATA_API_KEY or PINATA_SECRET env");
  return {
    pinata_api_key: key,
    pinata_secret_api_key: secret,
    ...extraHeaders,
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    // Expect JSON from frontend
    const body = await req.json();

    // Case A: frontend wants to pin a JSON metadata (body.metadataObject)
    if (body.metadataObject) {
      const pinBody = {
        pinataMetadata: { name: body.name || "metadata" },
        pinataContent: body.metadataObject,
      };
      const r = await axios.post(PINATA_URL_JSON, pinBody, { headers: getPinataHeaders({ "Content-Type": "application/json" })});
      return NextResponse.json({ cid: r.data.IpfsHash, ipfsUrl: `ipfs://${r.data.IpfsHash}` });
    }

    // Case B: frontend sends file base64: { fileName, fileData: "data:<mime>;base64,..." }
    if (body.fileData && body.fileName) {
      // parse data url
      const matches = /^data:(.+);base64,(.+)$/.exec(body.fileData);
      if (!matches) throw new Error("Invalid fileData, expected data:<mime>;base64,...");
      const mime = matches[1];
      const b64 = matches[2];
      const buffer = Buffer.from(b64, "base64");

      const form = new FormData();
      form.append("file", buffer, { filename: body.fileName, contentType: mime });

      // optional metadata
      if (body.pinataMetadata) form.append("pinataMetadata", JSON.stringify(body.pinataMetadata));
      if (body.pinataOptions) form.append("pinataOptions", JSON.stringify(body.pinataOptions));

      const headers = {
        ...getPinataHeaders(),
        ...form.getHeaders(),
      };

      const r = await axios.post(PINATA_URL_FILE, form as any, { headers, maxBodyLength: 1024 * 1024 * 50 });
      return NextResponse.json({ cid: r.data.IpfsHash, ipfsUrl: `ipfs://${r.data.IpfsHash}` });
    }

    return NextResponse.json({ error: "Bad request: expected metadataObject OR fileData+fileName" }, { status: 400 });
  } catch (err: any) {
    console.error("api/pin error:", err?.response?.data || err?.message || err);
    const message = err?.response?.data || err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
