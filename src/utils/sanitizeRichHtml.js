import DOMPurify from 'dompurify'

const config={ALLOWED_TAGS:['a','b','blockquote','br','code','div','em','h1','h2','h3','h4','h5','h6','hr','i','li','ol','p','pre','span','strong','sub','sup','table','tbody','td','th','thead','tr','u','ul'],ALLOWED_ATTR:['class','style','href','target','rel','colspan','rowspan','scope'],ALLOWED_URI_REGEXP:/^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i}

export function sanitizeRichHtml(content){
  if(typeof content!=='string') return ''
  if(!/<[^>]+>/.test(content)) return content
  return DOMPurify.sanitize(content,config)
}
