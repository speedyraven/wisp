import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../App.css";

export default function ChatList() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(list);
      },
      (error) => {
        console.error("ChatList query FAILED:", error.code, error.message);
      }
    );

    return unsubscribe;
  }, [currentUser.uid]);

  return (
    <div className="screen">
      <div className="app-header">
        <h2>wisp</h2>
        <div className="header-actions">
          <Link to="/new-chat">+ New</Link>
          <button onClick={() => signOut(auth)} className="btn-link" style={{ color: "var(--text-dim)" }}>
            Log out
          </button>
        </div>
      </div>

      <div>
        {chats.length === 0 && (
          <p className="empty-state">No chats yet. Start one with "+ New" above.</p>
        )}
        {chats.map((chat) => {
          const otherEmail = chat.participantEmails?.find((e) => e !== currentUser.email);
          const initial = otherEmail ? otherEmail[0].toUpperCase() : "?";
          return (
            <Link key={chat.id} to={`/chat/${chat.id}`} className="chat-row">
              <div className="avatar">{initial}</div>
              <div className="chat-row-name">{otherEmail || "Unknown"}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}