async function buildP2fkRecipientsAndCost({ messageText, attachments, extraRecipients = [], fromAddress, amountPerRecipient }

async function sendManyWithWallet(outputs) {
      return buildAndBroadcastInternalTx(outputs);
    }

async function signWithWallet(messageText) {
      if (!internalPrivKeyBytes) throw new Error('Internal wallet is locked');
      // Match bitcoin-cli signmessage/verifymessage semantics used by DiscoBall (SUP Root.cs).
      const messageDigest = await hashBitcoinSignedMessage(messageText);
      const { r, s, recoveryId } = await ecSign(internalPrivKeyBytes, messageDigest);
      // DiscoBall p2fk expects a compact 65-byte Bitcoin message signature encoded as base64:
      // [recoveryByte (1), r (32), s (32)] where recoveryByte = 27 + 4 (compressed) + recoveryId
      const compact = new Uint8Array(65);
      compact[0] = 27 + 4 + recoveryId;
      compact.set(bigIntToBytes32(r), 1);
      compact.set(bigIntToBytes32(s), 33);
      return btoa(String.fromCharCode.apply(null, compact));
    }
