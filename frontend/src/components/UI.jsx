import { AlertCircle, Check, LoaderCircle, PawPrint } from 'lucide-react'
export function Loading({ text = 'Preparando tudo por aqui…' }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={22} />{text}</div> }
export function Notice({ children, success = false }) { return children ? <div className={`notice ${success ? 'success' : ''}`} role={success ? 'status' : 'alert'}>{success ? <Check size={18} /> : <AlertCircle size={18} />}<span>{children}</span></div> : null }
export function Empty({ title, children, action }) { return <div className="empty"><span className="icon-circle"><PawPrint /></span><h3>{title}</h3><p>{children}</p>{action}</div> }
export function PageHeading({ eyebrow, title, children, action }) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div>{action}</div> }
export function Submit({ busy, children, ...props }) { return <button className="btn primary" disabled={busy} {...props}>{busy && <LoaderCircle size={17} className="spin" />}{busy ? 'Só um instante…' : children}</button> }
