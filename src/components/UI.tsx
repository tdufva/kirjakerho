import { useEffect, useRef, useId, type ReactNode } from 'react'
import { jazzCoverColors,jazzPalette } from '../data/jazzTheme'
import { BookOpen,ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Work } from '../domain/model'
import { average,format } from '../domain/statistics'
export function ArrowLink({to,children}:{to:string;children:ReactNode}) {return <Link className="text-link" to={to}>{children}<ArrowUpRight size={19}/></Link>}
export function SectionTitle({number,title,link,linkLabel='Katso kaikki'}:{number:string;title:string;link?:string;linkLabel?:string}) {return <div className="section-heading"><h2><span className="section-number">{number}</span>{title}</h2>{link&&<ArrowLink to={link}>{linkLabel}</ArrowLink>}</div>}
export function Cover({work,small=false}:{work:Work;small?:boolean}) {
 if(work.metadata?.cover) return <div className={`book-cover external-cover ${small?'small':''}`}><img src={work.metadata.cover} alt={`${work.title}, kansikuva`} onError={e=>{e.currentTarget.style.display='none'}}/><span>{work.title}</span></div>
 return <div className={`book-cover motif-${work.motif} ${small?'small':''}`} style={{'--cover':jazzCoverColors[work.motif % jazzCoverColors.length],'--cover-ink':work.motif % 6===3||work.motif % 6===4?jazzPalette.shadow:jazzPalette.ivory} as React.CSSProperties} aria-hidden="true">
  <div className="cover-top"><span>KIRJAKERHON KOKOELMA</span><span>{work.publicationYear??'ATLAS'}</span></div>
  <div className="cover-author">{work.creator}</div><div className="cover-title">{work.title}</div>
  <svg className="cover-art" viewBox="0 0 200 160" fill="none" aria-hidden="true">
   <g className="deco-arches"><path d="M22 151V80a78 78 0 0 1 156 0v71M34 151V80a66 66 0 0 1 132 0v71M46 151V80a54 54 0 0 1 108 0v71M58 151V80a42 42 0 0 1 84 0v71M70 151V80a30 30 0 0 1 60 0v71M82 151V80a18 18 0 0 1 36 0v71"/><path d="M22 123h156M22 133h156M22 143h156"/></g>
   <g className="deco-columns"><path d="M25 150V68h22V42h22V18h62v24h22v26h22v82M36 150V80h22V54h22V30h40v24h22v26h22v70M91 30v120M109 30v120M25 150h150M25 140h150"/></g>
   <g className="deco-curtain"><path d="M20 10h160v140H20zM28 10v140M172 10v140M36 10v132M164 10v132M42 10c0 47 18 79 58 124 40-45 58-77 58-124M53 10c0 45 16 70 47 106 31-36 47-71 47-106M64 10c0 36 12 58 36 86 24-28 36-60 36-86M75 10c0 30 9 47 25 67 16-20 25-47 25-67"/></g>
  </svg>
  <div className="cover-foot"><span>ATLAS</span><span className="cover-edition">KOKOELMA</span></div>
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
export function Empty({children}:{children:ReactNode}) {return <div className="empty-state"><BookOpen className="empty-book" size={42} strokeWidth={1}/>{children}</div>}
export function ErrorText({message}:{message:string}) {return message?<p className="error-text" role="alert">{message}</p>:null}
