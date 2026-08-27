import DOMPurify from 'dompurify'

const config={ALLOWED_TAGS:['a','b','blockquote','br','code','div','em','h1','h2','h3','h4','h5','h6','hr','i','li','ol','p','pre','span','strong','sub','sup','table','tbody','td','th','thead','tr','u','ul'],ALLOWED_ATTR:['class','href','target','rel','colspan','rowspan','scope'],ALLOWED_URI_REGEXP:/^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function sanitizeRichHtml(content){
  if(typeof content!=='string') return ''
  return DOMPurify.sanitize(content,config)
}
