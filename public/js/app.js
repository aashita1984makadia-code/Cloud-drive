const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let cart=[], payment="Cash";

function money(n){return "₹"+Number(n||0).toFixed(2)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function showPage(page){
  $$(".page").forEach(x=>x.classList.remove("active"));
  $("#"+page).classList.add("active");
  $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  $("#pageTitle").textContent=page[0].toUpperCase()+page.slice(1);
  if(page==="products") loadProducts();
  if(page==="sales") loadSales();
  if(page==="dashboard") loadDashboard();
}
$$(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));

async function loadProducts(q=""){
  const data=await fetch("/api/products"+(q?"?q="+encodeURIComponent(q):"")).then(r=>r.json());
  $("#productBody").innerHTML=data.map(p=>`<tr>
    <td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.barcode||"-")}</td><td>${escapeHtml(p.category)}</td>
    <td>${money(p.price)}</td><td>${p.gst}%</td><td>${p.stock}</td>
    <td><button class="danger" onclick="deleteProduct(${p.id})">Delete</button></td>
  </tr>`).join("");
}
async function deleteProduct(id){if(!confirm("Delete this product?"))return;await fetch("/api/products/"+id,{method:"DELETE"});loadProducts();}

async function searchProducts(q){
  if(!q){$("#suggestions").innerHTML="";return}
  const data=await fetch("/api/products?q="+encodeURIComponent(q)).then(r=>r.json());
  $("#suggestions").innerHTML=data.slice(0,8).map(p=>`<button class="suggestion" onclick='addProduct(${JSON.stringify(p)})'>${escapeHtml(p.name)} · ${money(p.price)} · Stock ${p.stock}</button>`).join("");
}
function addProduct(p){
  const found=cart.find(x=>x.product_id===p.id);
  if(found){if(found.qty<p.stock)found.qty++;else alert("Not enough stock");}
  else {if(p.stock<1)return alert("Out of stock");cart.push({product_id:p.id,name:p.name,price:p.price,gst:p.gst,qty:1,stock:p.stock});}
  $("#suggestions").innerHTML="";$("#billSearch").value="";renderCart();$("#barcode").focus();
}
function renderCart(){
  $("#cartBody").innerHTML=cart.map((x,i)=>`<tr>
    <td><b>${escapeHtml(x.name)}</b><br><small>${escapeHtml(x.product_id)}</small></td>
    <td>${money(x.price)}</td>
    <td><input class="qty" type="number" min="1" max="${x.stock}" value="${x.qty}" onchange="changeQty(${i},this.value)"></td>
    <td>${x.gst}%</td><td>${money(x.price*x.qty)}</td>
    <td><button class="danger" onclick="removeItem(${i})">×</button></td>
  </tr>`).join("");
  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const discount=Math.max(0,Number($("#discount").value)||0);
  const taxable=Math.max(0,subtotal-discount);
  const gst=cart.reduce((s,x)=>s+(x.price*x.qty*x.gst/100)*(taxable/subtotal||1),0);
  $("#subtotal").textContent=money(subtotal);$("#gst").textContent=money(gst);$("#grandTotal").textContent=money(taxable+gst);
}
function changeQty(i,v){cart[i].qty=Math.max(1,Math.min(cart[i].stock,Number(v)||1));renderCart()}
function removeItem(i){cart.splice(i,1);renderCart()}

$("#scanBtn").onclick=async()=>{
  const code=$("#barcode").value.trim();if(!code)return;
  const r=await fetch("/api/products/barcode/"+encodeURIComponent(code));
  if(!r.ok)return alert("Product not found");
  addProduct(await r.json());$("#barcode").value="";
};
$("#barcode").addEventListener("keydown",e=>{if(e.key==="Enter")$("#scanBtn").click()});
$("#billSearch").oninput=e=>searchProducts(e.target.value);
$("#discount").oninput=renderCart;
$$(".pay").forEach(b=>b.onclick=()=>{$$(".pay").forEach(x=>x.classList.remove("active"));b.classList.add("active");payment=b.dataset.pay});

$("#clearCart").onclick=()=>{cart=[];renderCart()};
$("#checkout").onclick=async()=>{
  if(!cart.length)return alert("Add products first");
  const discount=Number($("#discount").value)||0;
  const r=await fetch("/api/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:cart.map(x=>({product_id:x.product_id,qty:x.qty})),discount,payment_method:payment})});
  const data=await r.json();
  if(!r.ok)return alert(data.error);
  alert(`Bill ${data.billNo}\\nTotal: ${money(data.total)}\\nPayment: ${payment}`);
  cart=[];$("#discount").value=0;renderCart();
};

$("#newProduct").onclick=()=>$("#modal").classList.remove("hidden");
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#productForm").onsubmit=async e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());
  const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const out=await r.json();if(!r.ok)return alert(out.error);
  e.target.reset();$("#modal").classList.add("hidden");loadProducts();
};
$("#productSearch").oninput=e=>loadProducts(e.target.value);

async function loadSales(){
  const data=await fetch("/api/sales").then(r=>r.json());
  $("#salesBody").innerHTML=data.map(s=>`<tr><td><b>${s.bill_no}</b></td><td>${new Date(s.created_at).toLocaleString()}</td><td>${money(s.subtotal)}</td><td>${money(s.discount)}</td><td>${money(s.gst)}</td><td><b>${money(s.total)}</b></td><td>${escapeHtml(s.payment_method)}</td></tr>`).join("");
}
async function loadDashboard(){
  const d=await fetch("/api/dashboard").then(r=>r.json());
  $("#dProducts").textContent=d.products;$("#dStock").textContent=d.stock;$("#dSales").textContent=d.sales;
  $("#dRevenue").textContent=money(d.revenue);$("#dLow").textContent=d.lowStock;
}
function clock(){ $("#clock").textContent=new Date().toLocaleString(); }
setInterval(clock,1000);clock();renderCart();