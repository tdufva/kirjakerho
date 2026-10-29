import { useEffect, useRef, useId, type ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Work } from '../domain/model'
import { average,format } from '../domain/statistics'
export function ArrowLink({to,children}:{to:string;children:ReactNode}) {return <Link className="text-link" to={to}>{children}<ArrowUpRight size={19}/></Link>}
export function SectionTitle({number,title,link,linkLabel='Katso kaikki'}:{number:string;title:string;link?:string;linkLabel?:string}) {return <div className="section-heading"><h2><span className="section-number">{number}</span>{title}</h2>{link&&<ArrowLink to={link}>{linkLabel}</ArrowLink>}</div>}
export function Cover({work,small=false}:{work:Work;small?:boolean}) {
 if(work.metadata?.cover) return <div className={`book-cover external-cover ${small?'small':''}`}><img src={work.metadata.cover} alt={`${work.title}, kansikuva`} onError={e=>{e.currentTarget.style.display='none'}}/><span>{work.title}</span></div>
 return <div className={`book-cover motif-${work.motif} ${small?'small':''}`} style={{'--cover':work.color} as React.CSSProperties} aria-hidden="true">
  <div className="cover-top"><span>KIRJAKERHON KOKOELMA</span><span>{work.publicationYear??'ATLAS'}</span></div>
  <div className="cover-author">{work.creator}</div><div className="cover-title">{work.title}</div>
  <svg className="cover-art" viewBox="0 0 200 160"><circle className="shape-a" cx="100" cy="90" r="66"/><circle className="shape-b" cx="142" cy="90" r="60"/><path className="shape-c" d="M0 145 105 5 200 145Z"/><path className="shape-d" d="M15 50H185M15 75H185M15 100H185M15 125H185"/><rect className="shape-e" x="60" y="5" width="75" height="150"/></svg>
  <div className="cover-foot"><span>ATLAS</span><span>✳</span></div>
 </div>
}
export function WorkCard({work,index}:{work:Work;index?:number}) {return <Link to={`/teos/${work.id}`} className="work-card">
 <div className="cover-wrap"><Cover work={work}/><span className="score-stamp"><strong>{format(average(work))}</strong><span>/ 10</span></span>{index!==undefined&&<span className="rank-number">{String(index+1).padStart(2,'0')}</span>}</div>
 <p className="work-creator">{work.creator}</p><h3>{work.title}</h3><p className="work-sub">{work.date?.slice(0,4)??'Ei päiväystä'}<span>·</span>{work.ratings.length} arviota</p>
 </Link>}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null), titleId=useId()
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close()},[])
 return <dialog ref={ref} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose()}} className="modal"><div className="modal-top"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Sulje"><X/></button></div>{children}</dialog>
}
export function Empty({children}:{children:ReactNode}) {return <div className="empty-state"><span className="asterisk">✳</span>{children}</div>}
export function ErrorText({message}:{message:string}) {return message?<p className="error-text" role="alert">{message}</p>:null}
