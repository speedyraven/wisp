import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { encryptText, decryptText, getStoredPrivateKey } from "../crypto";
import "../App.css";

const REVEAL_SECONDS = 5;
const TYPING_TIMEOUT_MS = 2000;

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Chat() {
  const { chatId } = useParams();
  const { currentUser } = useAuth();

  const [messages, setMessages] = useState([]);
  const [decrypted, setDecrypted] = useState({});
  const [draft, setDraft] = useState("");
  const [chatInfo, setChatInfo] = useState(null);
  const [otherPublicKey, setOtherPublicKey] = useState(null);
  const [revealing, setRevealing] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef(null);
  const timers = useRef({});
  const typingTimeoutRef = useRef(null);

  const myPrivateKey = getStoredPrivateKey(currentUser.uid);

  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(db, "chats", chatId);
    const unsubscribe = onSnapshot(chatRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setChatInfo(data);
      const otherUid = data.participants?.find((uid) => uid !== currentUser.uid);
      if (otherUid) {
        const otherUserDoc = await getDoc(doc(db, "users", otherUid));
        if (otherUserDoc.exists()) {
          setOtherPublicKey(otherUserDoc.data().publicKey || null);
        }
      }
    });
    return unsubscribe;
  }, [chatId, currentUser.uid]);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    if (!otherPublicKey || !myPrivateKey) return;

    messages.forEach(async (m) => {
      if (m.status === "sealed") return;
      if (decrypted[m.id]) return;
      if (!m.ciphertext || !m.nonce) return;

      try {
        const plain = await decryptText(m.ciphertext, m.nonce, otherPublicKey, myPrivateKey);
        setDecrypted((prev) => ({ ...prev, [m.id]: plain }));
      } catch {
        setDecrypted((prev) => ({ ...prev, [m.id]: "🔒 unable to decrypt on this device" }));
      }
    });
  }, [messages, otherPublicKey, myPrivateKey, decrypted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, decrypted]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  async function setTyping(isTyping) {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`typing.${currentUser.uid}`]: isTyping,
      });
    } catch {
      // non-critical
    }
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !chatId || !otherPublicKey || !myPrivateKey) return;
    setDraft("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);

    const { ciphertext, nonce } = await encryptText(text, otherPublicKey, myPrivateKey);

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUser.uid,
      ciphertext,
      nonce,
      status: "sealed",
      createdAt: serverTimestamp(),
      openedAt: null,
    });
  }

  async function handleOpen(msg) {
    if (msg.status !== "sealed") return;

    const msgRef = doc(db, "chats", chatId, "messages", msg.id);
    await updateDoc(msgRef, {
      status: "opened",
      openedAt: serverTimestamp(),
    });

    setRevealing((prev) => ({ ...prev, [msg.id]: true }));

    const timer = setTimeout(async () => {
      await deleteDoc(msgRef);
    }, REVEAL_SECONDS * 1000);

    timers.current[msg.id] = timer;
  }

  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(decrypted[msg.id] || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(msg) {
    const trimmed = editText.trim();
    if (!trimmed || !otherPublicKey || !myPrivateKey) return cancelEdit();
    const { ciphertext, nonce } = await encryptText(trimmed, otherPublicKey, myPrivateKey);
    const msgRef = doc(db, "chats", chatId, "messages", msg.id);
    await updateDoc(msgRef, { ciphertext, nonce });
    setDecrypted((prev) => ({ ...prev, [msg.id]: trimmed }));
    cancelEdit();
  }

  if (!chatId) {
    return (
      <div className="screen" style={{ padding: 40 }}>
        <h2>No chat selected</h2>
        <p>Go to <a href="/new-chat" style={{ color: "var(--accent-2)" }}>Start a new chat</a> to begin.</p>
        <button onClick={() => signOut(auth)} className="btn-link">Log out</button>
      </div>
    );
  }

  const otherEmail = chatInfo?.participantEmails?.find((e) => e !== currentUser.email);
  const otherUserId = chatInfo?.participants?.find((uid) => uid !== currentUser.uid);
  const otherIsTyping = !!chatInfo?.typing?.[otherUserId];

  return (
    <div className="screen" style={{ height: "100vh" }}>
      <div className="app-header">
        <div>
          <div><strong>{otherEmail || "Chat"}</strong></div>
          {otherIsTyping && <div className="typing-text">typing…</div>}
        </div>
        <button onClick={() => signOut(auth)} className="btn-link" style={{ color: "var(--text-dim)" }}>
          Log out
        </button>
      </div>

      <div className="chat-body">
        {messages.map((m) => {
          const isMine = m.senderId === currentUser.uid;
          const sealed = m.status === "sealed";
          const isRevealing = revealing[m.id];
          const isEditing = editingId === m.id;
          const plainText = decrypted[m.id];

          return (
            <div key={m.id} className="bubble-row" style={{ justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                {sealed ? (
                  isEditing ? (
                    <div className="bubble bubble-sealed" style={{ cursor: "default" }}>
                      <input
                        className="edit-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <button className="mini-btn" onClick={() => saveEdit(m)}>save</button>
                      <button className="mini-btn" onClick={cancelEdit}>cancel</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isMine && handleOpen(m)}
                      className={`bubble bubble-sealed ${!isMine ? "clickable" : ""}`}
                    >
                      🔒 {isMine ? "sealed — waiting to be opened" : "tap to open"}
                      {isMine && (
                        <button
                          className="mini-btn"
                          onClick={(e) => { e.stopPropagation(); startEdit(m); }}
                        >
                          edit
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div className={`bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
                    {plainText === undefined ? "decrypting…" : plainText}
                    {isRevealing && (
                      <div className="reveal-bar-track">
                        <div
                          className="reveal-bar-fill"
                          style={{ animation: `drain ${REVEAL_SECONDS}s linear forwards` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="msg-time">{formatTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="composer">
        <input
          className="composer-input"
          value={draft}
          onChange={handleDraftChange}
          placeholder="Type a message…"
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  );
}