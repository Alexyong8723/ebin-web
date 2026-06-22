"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getAllRewards, addReward, updateReward, deleteReward } from "@/lib/firestore";
import { Button, Badge, Card, Modal, Alert } from "@/components/ui";
import s from "./page.module.css";

const EMPTY = { name:"", details:"", pointsCost:"", validityDays:"30", stock:"-1", isActive:true };

export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => { getAllRewards().then(setRewards); }, []);

  function openAdd()  { setForm(EMPTY); setModal("add"); setErr(""); }
  function openEdit(r){ setForm({ name:r.name, details:r.details, pointsCost:r.pointsCost, validityDays:r.validityDays, stock:r.stock, isActive:r.isActive, _id:r.id }); setModal("edit"); setErr(""); }

  async function handleSave(e) {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      const data = { name:form.name, details:form.details, pointsCost:parseInt(form.pointsCost), validityDays:parseInt(form.validityDays), stock:parseInt(form.stock), isActive:form.isActive };
      if (form._id) await updateReward(form._id, data);
      else await addReward(data);
      const updated = await getAllRewards(); setRewards(updated); setModal(null);
    } catch { setErr("Failed to save."); }
    finally { setSaving(false); }
  }

  async function toggleActive(r) {
    await updateReward(r.id, { isActive:!r.isActive });
    setRewards(p=>p.map(x=>x.id===r.id?{...x,isActive:!x.isActive}:x));
  }

  async function handleDelete(id) {
    if (!confirm("Delete this reward?")) return;
    await deleteReward(id); setRewards(p=>p.filter(r=>r.id!==id));
  }

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}>
          <div><h1 className={s.title}>Rewards</h1><p className={s.sub}>{rewards.length} rewards in catalog</p></div>
          <Button onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Add Reward
          </Button>
        </div>

        <Card>
          <table className={s.tbl}>
            <thead><tr><th>Reward</th><th>Cost</th><th>Validity</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rewards.map(r=>(
                <tr key={r.id}>
                  <td>
                    <p className={s.rName}>{r.name}</p>
                    <p className={s.rDetails}>{r.details}</p>
                  </td>
                  <td className={s.tdPts}>{r.pointsCost} pts</td>
                  <td className={s.tdMeta}>{r.validityDays}d</td>
                  <td className={s.tdMeta}>{r.stock===-1?"Unlimited":r.stock}</td>
                  <td>
                    <button className={[s.toggle, r.isActive&&s.toggleOn].join(" ")} onClick={()=>toggleActive(r)}>
                      <span className={s.toggleThumb}/>
                    </button>
                  </td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.iconBtn} onClick={()=>openEdit(r)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className={[s.iconBtn,s.iconDanger].join(" ")} onClick={()=>handleDelete(r.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add Reward":"Edit Reward"} onClose={()=>setModal(null)}>
          {err && <Alert>{err}</Alert>}
          <form onSubmit={handleSave} className={s.modalForm}>
            <div className={s.fld}><label className={s.lbl}>Reward Name</label><input className={s.inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. RM5 Touch 'n Go"/></div>
            <div className={s.fld}><label className={s.lbl}>Details</label><textarea className={s.inp} rows={2} value={form.details} onChange={e=>setForm(p=>({...p,details:e.target.value}))} required placeholder="Describe the reward and terms"/></div>
            <div className={s.row}>
              <div className={s.fld}><label className={s.lbl}>Points Cost</label><input type="number" min="1" className={s.inp} value={form.pointsCost} onChange={e=>setForm(p=>({...p,pointsCost:e.target.value}))} required placeholder="e.g. 100"/></div>
              <div className={s.fld}><label className={s.lbl}>Validity (days)</label><input type="number" min="1" className={s.inp} value={form.validityDays} onChange={e=>setForm(p=>({...p,validityDays:e.target.value}))} required/></div>
            </div>
            <div className={s.row}>
              <div className={s.fld}><label className={s.lbl}>Stock (-1 = unlimited)</label><input type="number" min="-1" className={s.inp} value={form.stock} onChange={e=>setForm(p=>({...p,stock:e.target.value}))} required/></div>
              <div className={s.fld}><label className={s.lbl}>Active</label>
                <label className={s.checkLabel}><input type="checkbox" checked={form.isActive} onChange={e=>setForm(p=>({...p,isActive:e.target.checked}))}/> Show to users</label>
              </div>
            </div>
            <div className={s.modalBtns}>
              <Button variant="ghost" type="button" onClick={()=>setModal(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{modal==="add"?"Add Reward":"Save Changes"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
