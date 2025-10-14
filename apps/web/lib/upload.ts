export interface UploadResult {
    link: string;
    deleteHash?: string;
}

/**
 * Faz upload de uma imagem para o Imgur e retorna a URL pública.
 * Se nenhum clientId for fornecido, tentamos ler de process.env.NEXT_PUBLIC_IMGUR_CLIENT_ID.
 */
export async function uploadImageToImgur(
    file: File,
    clientId?: string,
): Promise<UploadResult> {
    const cid = clientId ?? process.env.NEXT_PUBLIC_IMGUR_CLIENT_ID;

    if (!cid) {
        throw new Error("Imgur client id não encontrado. Defina NEXT_PUBLIC_IMGUR_CLIENT_ID.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
            Authorization: `Client-ID ${cid}`,
        } as any,
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Imgur upload failed: ${res.status} ${text}`);
    }

    const json = await res.json();

    if (!json || !json.data || !json.data.link) {
        throw new Error("Resposta inválida do Imgur");
    }

    return { link: json.data.link, deleteHash: json.data.deletehash };
}
