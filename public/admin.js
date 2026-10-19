/* Moderation is checked server-side via auth.uid() + br_moderators. */
const $ = id => document.getElementById(id);
const escapeHTML = s => String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
async function loadQueue() {
  const api = window.BarrioAPI;
  if (!api?.configured) { $('message').textContent = 'Supabase todavia no esta configurado.'; return; }
  const user = await api.currentAdmin();
  if (!user) { $('login').hidden=false; $('message').textContent = 'Introduce tu correo. Recibirás un enlace, no un código.'; return; }
  $('adminAccount').textContent = `Sesión iniciada con ${user.email || 'tu correo'}. Los permisos de moderación se comprueban automáticamente.`;
  $('login').hidden=true;
  try {
    const rows = await api.adminQueue();
    $('message').textContent = `${rows.length} aportaciones pendientes`;
    $('board').innerHTML = rows.length ? rows.map(r => `
      <div class="card">
        <h3>Sector ${escapeHTML(r.cell_id)}</h3>
        <p class="small">Enviado: ${new Date(r.created_at).toLocaleString('es-ES')}</p>
        <div class="chips">
          <span class="chip">Dia ${r.day_score}/5</span>
          <span class="chip">Noche ${r.night_score}/5</span>
          <span class="chip">Luz ${r.light_score}/5</span>
          <span class="chip">Acustica ${r.noise_score}/5</span>
        </div>
        <p>Observaciones: ${escapeHTML((Array.isArray(r.tags) ? r.tags : []).join(', ') || 'Sin etiquetas')}</p>
        <p><strong>Comentario del usuario:</strong> ${r.comment_text ? `<span class="admin-comment">${escapeHTML(r.comment_text)}</span>` : 'Sin comentario escrito'}</p>
        <p class="small">Comprueba que el texto no contenga datos personales, acusaciones o referencias identificables antes de aprobarlo. La aprobación publica las puntuaciones y el comentario conjuntamente.</p>
        <div class="actions">
          <button data-id="${escapeHTML(r.id)}" data-action="approved">Aprobar</button>
          <button class="reject" data-id="${escapeHTML(r.id)}" data-action="rejected">Rechazar</button>
        </div>
      </div>`).join('') : '<div class="empty">No quedan aportaciones pendientes.</div>';
    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => moderate(btn)));
  } catch (err) { $('message').textContent = err.message || 'No se pudo acceder a la cola.'; }
}
async function moderate(btn) {
  btn.disabled = true;
  try {
    await window.BarrioAPI.moderate(btn.dataset.id, btn.dataset.action);
    await loadQueue();
  } catch (err) { $('message').textContent = err.message; btn.disabled = false; }
}
$('login').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button'); btn.disabled = true;
  try {
    const email = $('email').value.trim();
    await window.BarrioAPI.sendLoginEmail(email, "/admin.html");
    $('message').textContent = 'Te hemos enviado un enlace por correo. Ábrelo para regresar al panel. No necesitas ningún código.';
  } catch (err) { $('message').textContent = err.message || 'No se pudo solicitar acceso.'; }
  finally { btn.disabled = false; }
});
if (window.BarrioAPI?.configured) window.BarrioAPI.onCommunityAuthChange(loadQueue);
loadQueue();
