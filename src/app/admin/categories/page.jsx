"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getCategories, addCategory, updateCategory, deleteCategory } from "@/lib/firestore";
import { Button, Card, Modal, Alert } from "@/components/ui";
import s from "./page.module.css";

const EMPTY = { name:"", description:"", pointsPerKg:"", icon:"" };
const ICONS = ["battery","phone","laptop","cable","appliance","printer","tv","other"];

export default function AdminCategories() {
  const [cats, setCats]     = useState([]);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => { getCategories().then(setCats); }, []);

  function openAdd()  { setForm(EMPTY); setModal("add"); setErr(""); }
  function openEdit(c){ setForm({ name:c.name, description:c.description, pointsPerKg:c.pointsPerKg, icon:c.icon, _id:c.id }); setModal("edit"); setErr(""); }

  async function handleSave(e) {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      const data = { name:form.name, description:form.description, pointsPerKg:parseFloat(form.pointsPerKg), icon:form.icon };
      if (form._id) await updateCategory(form._id, data);
      else await addCategory(data);
      const updated = await getCategories(); setCats(updated); setModal(null);
    } catch { setErr("Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(id); setCats(p=>p.filter(c=>c.id!==id));
  }

  const CAT_EMOJI = { battery:"🔋", phone:"📱", laptop:"💻", cable:"🔌", appliance:"📺", printer:"🖨️", tv:"📺", other:"♻️" };

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}>
          <div><h1 className={s.title}>Categories</h1><p className={s.sub}>Manage e-waste item types and point rates</p></div>
          <Button onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Add Category
          </Button>
        </div>

        <div className={s.grid}>
          {cats.map(c=>(
            <Card key={c.id} className={s.catCard}>
              <div className={s.catTop}>
                <div className={s.catEmoji}>{CAT_EMOJI[c.icon]||"♻️"}</div>
                <div className={s.catActions}>
                  <button className={s.iconBtn} onClick={()=>openEdit(c)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className={[s.iconBtn,s.iconDanger].join(" ")} onClick={()=>handleDelete(c.id)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
              <h3 className={s.catName}>{c.name}</h3>
              <p className={s.catDesc}>{c.description}</p>
              <div className={s.catPts}><span>{c.pointsPerKg}</span> pts / kg</div>
            </Card>
          ))}
        </div>
      </div>

      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add Category":"Edit Category"} onClose={()=>setModal(null)}>
          {err && <Alert>{err}</Alert>}
          <form onSubmit={handleSave} className={s.modalForm}>
            <div className={s.fld}><label className={s.lbl}>Category Name</label><input className={s.inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. Battery"/></div>
            <div className={s.fld}><label className={s.lbl}>Description</label><input className={s.inp} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description"/></div>
            <div className={s.fld}><label className={s.lbl}>Points per kg</label><input type="number" min="0.1" step="0.5" className={s.inp} value={form.pointsPerKg} onChange={e=>setForm(p=>({...p,pointsPerKg:e.target.value}))} required placeholder="e.g. 10"/></div>
            <div className={s.fld}>
              <label className={s.lbl}>Icon</label>
              <div className={s.iconGrid}>
                {ICONS.map(ic=>(
                  <button type="button" key={ic} className={[s.iconOpt, form.icon===ic&&s.iconOptSel].join(" ")} onClick={()=>setForm(p=>({...p,icon:ic}))}>
                    <span>{CAT_EMOJI[ic]||"♻️"}</span><span className={s.iconLbl}>{ic}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={s.modalBtns}>
              <Button variant="ghost" type="button" onClick={()=>setModal(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{modal==="add"?"Add Category":"Save Changes"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
