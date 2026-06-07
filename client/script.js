/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

function toggle(id){
    //var elem=window.event.srcElement;
    //elem.getParent().style.background='red';
    var n=document.getElementById(id);
    if (n.style.display=='none')
        n.style.display='table';
    else
        n.style.display='none';
    return false;
};
