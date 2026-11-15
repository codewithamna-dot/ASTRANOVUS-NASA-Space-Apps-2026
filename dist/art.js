window.GameArt={
 clue:id=>({wound:'body',ribbon:'desk',passage:'shelf',fire:'fireplace',roster:'ledger'}[id]||id),
 svg:id=>{const views={door:[7,45],window:[28,25],clock:[49,17],shelf:[72,34],desk:[53,48],key:[58,47],receipt:[46,49],body:[62,77],fireplace:[92,52],ledger:[94,74],trail:[72,66]};const a=views[id]||[50,50];return `<div class="photo-evidence" role="img" aria-label="${id} scene detail" style="background-image:url('assets/${id==='trail'?'stair-shadow.jpg':id==='key'?'room-06.png':'room-12.png'}');background-position:${a[0]}% ${a[1]}%;background-size:${id==='trail'?'cover':'280%'}"></div>`;}
};
