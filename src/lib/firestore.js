import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, addDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "./firebase";

export const getUserProfile   = async (uid) => { const s = await getDoc(doc(db,"users",uid)); return s.exists()?{id:s.id,...s.data()}:null; };
export const getCategories    = async () => { const s = await getDocs(collection(db,"categories")); return s.docs.map(d=>({id:d.id,...d.data()})); };
export const getEbins         = async () => { const s = await getDocs(collection(db,"ebins")); return s.docs.map(d=>({id:d.id,...d.data()})); };
export const getRewardsCatalog= async () => { const s = await getDocs(query(collection(db,"rewards"),where("isActive","==",true))); return s.docs.map(d=>({id:d.id,...d.data()})); };
export const getAllRewards     = async () => { const s = await getDocs(collection(db,"rewards")); return s.docs.map(d=>({id:d.id,...d.data()})); };
export const getAllUsers       = async () => { const s = await getDocs(collection(db,"users")); return s.docs.map(d=>({id:d.id,...d.data()})); };

export const getUserSubmissions = async (uid, count=10) => {
  const q = query(collection(db,"users",uid,"submissions"), orderBy("submittedAt","desc"), limit(count));
  const s = await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()}));
};

export const getUserRewards = async (uid) => {
  const s = await getDocs(collection(db,"users",uid,"rewards"));
  return s.docs.map(d=>({id:d.id,...d.data()}));
};

export async function redeemReward(uid, reward) {
  const userRef = doc(db,"users",uid);
  const userData = (await getDoc(userRef)).data();
  if (userData.pointsTotal < reward.pointsCost) throw new Error("Not enough points");
  const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate()+reward.validityDays);
  const code = Math.random().toString(36).substring(2,10).toUpperCase();
  await addDoc(collection(db,"users",uid,"rewards"),{
    rewardId:reward.id, rewardName:reward.name,
    redeemedAt:serverTimestamp(), expiresAt, status:"active", redemptionCode:code,
  });
  await updateDoc(userRef,{ pointsTotal: increment(-reward.pointsCost) });
  return code;
}

export const addEbin      = async (data) => addDoc(collection(db,"ebins"),{...data,createdAt:serverTimestamp()});
export const updateEbin   = async (id,data) => updateDoc(doc(db,"ebins",id),{...data,lastUpdated:serverTimestamp()});
export const deleteEbin   = async (id) => deleteDoc(doc(db,"ebins",id));
export const addReward    = async (data) => addDoc(collection(db,"rewards"),{...data,createdAt:serverTimestamp()});
export const updateReward = async (id,data) => updateDoc(doc(db,"rewards",id),data);
export const deleteReward = async (id) => deleteDoc(doc(db,"rewards",id));
export const addCategory  = async (data) => addDoc(collection(db,"categories"),{...data,createdAt:serverTimestamp()});
export const updateCategory= async (id,data) => updateDoc(doc(db,"categories",id),data);
export const deleteCategory= async (id) => deleteDoc(doc(db,"categories",id));

// ── QR Point Tokens ────────────────────────────────────────────────────────────

/** Admin: create a one-time QR token for a bin, worth `points` points */
export async function createQrToken({ binId, binName, points, label }) {
  const token = "QR-" + Math.random().toString(36).substring(2,10).toUpperCase();
  const ref = await addDoc(collection(db,"qrTokens"), {
    token, binId, binName, points, label: label||"",
    used: false, usedBy: null, usedAt: null,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, token };
}

/** Admin: list all QR tokens for a specific bin */
export async function getQrTokensByBin(binId) {
  const q = query(collection(db,"qrTokens"), where("binId","==",binId), orderBy("createdAt","desc"));
  const s = await getDocs(q);
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

/**
 * User: scan and redeem a QR token.
 * Returns the points awarded, or throws a descriptive error.
 */
export async function redeemQrToken(token, uid) {
  const q = query(collection(db,"qrTokens"), where("token","==",token));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid QR code. Please try again.");

  const docSnap = snap.docs[0];
  const data = docSnap.data();

  if (data.used) throw new Error("This QR code has already been redeemed.");

  await updateDoc(doc(db,"qrTokens",docSnap.id), {
    used: true, usedBy: uid, usedAt: serverTimestamp(),
  });
  await updateDoc(doc(db,"users",uid), { pointsTotal: increment(data.points) });

  return { points: data.points, binName: data.binName, label: data.label };
}
