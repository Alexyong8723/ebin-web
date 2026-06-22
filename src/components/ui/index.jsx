// src/components/ui/index.jsx
"use client";
import s from "./ui.module.css";

export function Button({ children, variant="primary", size="md", loading, fullWidth, ...p }) {
  return (
    <button className={[s.btn,s[variant],s[`sz${size}`],fullWidth&&s.full,loading&&s.loading].filter(Boolean).join(" ")}
      disabled={loading||p.disabled} {...p}>
      {loading ? <span className={s.spin}/> : children}
    </button>
  );
}

export function Input({ label, icon, error, right, ...p }) {
  return (
    <div className={s.field}>
      {label && <label className={s.label}>{label}</label>}
      <div className={s.iWrap}>
        {icon && <span className={s.iIcon}>{icon}</span>}
        <input className={[s.input,icon&&s.hasIcon,error&&s.iErr].filter(Boolean).join(" ")} {...p}/>
        {right && <span className={s.iRight}>{right}</span>}
      </div>
      {error && <p className={s.errTxt}>{error}</p>}
    </div>
  );
}

export function Badge({ children, color="green" }) {
  return <span className={[s.badge,s[`b${color}`]].join(" ")}>{children}</span>;
}

export function Card({ children, className, ...p }) {
  return <div className={[s.card,className].filter(Boolean).join(" ")} {...p}>{children}</div>;
}

export function Alert({ children, type="error" }) {
  return <div className={[s.alert,s[`al${type}`]].join(" ")}>{children}</div>;
}

export function Spinner({ size=32 }) {
  return <div className={s.bigSpin} style={{width:size,height:size}}/>;
}

export function Modal({ title, children, onClose }) {
  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <h3 className={s.modalTitle}>{title}</h3>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}
