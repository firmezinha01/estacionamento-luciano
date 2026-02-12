// Chave privada gerada pelo QZ Tray (exemplo)
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAx...
...restante da chave...
-----END PRIVATE KEY-----`;

qz.security.setSignatureAlgorithm("SHA512");

qz.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
        try {
            const sig = new KJUR.crypto.Signature({ alg: "SHA512withRSA" });
            sig.init(privateKey);
            sig.updateString(toSign);
            const hex = sig.sign();
            resolve(hex);
        } catch (err) {
            reject(err);
        }
    };
});