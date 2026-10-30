import { useEffect, useRef, useId, type ReactNode } from 'react'
import { jazzCoverColors,jazzPalette } from '../data/jazzTheme'
import { BookOpen,ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Work } from '../domain/model'
import { average,format } from '../domain/statistics'
export function ArrowLink({to,children}:{to:string;children:ReactNode}) {return <Link className="text-link" to={to}>{children}<ArrowUpRight size={19}/></Link>}
export function SectionTitle({number,title,link,linkLabel='Katso kaikki'}:{number:string;title:string;link?:string;linkLabel?:string}) {return <div className="section-heading"><h2><span className="section-number">{number}</span>{title}</h2>{link&&<ArrowLink to={link}>{linkLabel}</ArrowLink>}</div>}
export function Cover({work,small=false}:{work:Work;small?:boolean}) {
 const brushId=`cover-brush-${useId().replace(/:/g,'')}`
 if(work.metadata?.cover) return <div className={`book-cover external-cover ${small?'small':''}`}><img src={work.metadata.cover} alt={`${work.title}, kansikuva`} onError={e=>{e.currentTarget.style.display='none'}}/><span>{work.title}</span></div>
 return <div className={`book-cover motif-${work.motif} ${small?'small':''}`} style={{'--cover':jazzCoverColors[work.motif % jazzCoverColors.length],'--cover-ink':work.motif % 6===3||work.motif % 6===4?jazzPalette.shadow:jazzPalette.ivory} as React.CSSProperties} aria-hidden="true">
  <div className="cover-top"><span>KIRJAKERHON KOKOELMA</span><span>{work.publicationYear??'ATLAS'}</span></div>
  <div className="cover-author">{work.creator}</div><div className="cover-title">{work.title}</div>
  <svg className="cover-art" viewBox="0 0 200 160" fill="none" aria-hidden="true">
   <defs><filter id={brushId} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".065 .12" numOctaves="2" seed="7" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
   <g className="deco-arches" filter={`url(#${brushId})`}><path d="M22 151C18 116 14 78 32 49 54 12 94 3 129 19 172 38 179 84 176 148M43 150C39 110 30 79 53 51 72 28 100 24 123 38 157 58 156 104 157 150M64 148C60 116 51 84 70 63 86 46 106 45 121 62 138 83 132 119 135 150M85 149C83 126 72 95 88 83 102 72 114 88 112 105L115 150"/><path d="M16 130Q93 122 182 134M25 144Q102 136 174 146"/></g>
   <g className="deco-columns" filter={`url(#${brushId})`}><path d="M34 149Q28 103 38 67L66 57 72 20 127 25 134 60 160 70Q168 112 163 149M55 148Q49 112 61 81L87 72 88 37 112 41 115 77 140 88 144 150M96 48Q91 95 100 149M28 142Q97 131 174 147"/></g>
   <g className="deco-curtain" filter={`url(#${brushId})`}><path d="M26 15Q20 79 99 145 172 89 177 19M46 11Q42 75 100 122 150 78 155 14M69 14Q64 62 99 94 131 64 132 15M91 16Q84 48 99 64 113 47 111 18M19 150Q102 142 184 153"/></g>
  </svg>
  <div className="cover-foot"><span>ATLAS</span><span className="cover-edition">KOKOELMA</span></div>
 </div>
}
export function WorkCard({work,index}:{work:Work;index?:number}) {return <Link to={`/teos/${work.id}`} className={`work-card work-pigment-${work.motif % 6}`}>
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
