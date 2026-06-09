window.onclick=(evt)=>{
  const {target}=evt
  if (!(target instanceof HTMLElement) || !target.classList.contains('toggler'))
    return
  const parent=target.parentElement
  if (parent==null)
    return
  for (const toggled of parent.querySelectorAll('.toggled')){
    toggled.classList.toggle('hidden')
  }
}
