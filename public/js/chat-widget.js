/**
 * Chat Widget — sdílené funkce pro AI chat (koncept, poptávky, budoucí moduly).
 *
 * Použití v Alpine.js komponentě:
 *   - Volby: na kontejneru chatu přidat @kk-volba="mojeMetoda($event.detail)"
 *   - Formátování: x-html="kkFormatujChat(msg.text)"
 *   - Scroll: kkScrollChat(this.$refs.chatBox)
 */

/**
 * Formátuje AI text — volby jako klikatelná tlačítka, markdown.
 * Volby generují CustomEvent 'kk-volba' s detail = celý text volby.
 */
function kkFormatujChat(text) {
    if (!text) return '';

    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // [VOLBY]...[/VOLBY] → klikatelná tlačítka
    html = html.replace(/\[VOLBY\]([\s\S]*?)\[\/VOLBY\]/g, (_, obsah) => {
        const volby = obsah.trim().split('\n').filter(v => v.trim());

        return '<div class="kk-volby">' + volby.map(v => {
            const m = v.trim().match(/^([a-zA-Z0-9X)]+)\)\s*(.+)/);
            if (!m) return '';

            const klic = m[1];
            const popis = m[2];
            const isSpecial = klic.toUpperCase() === 'X';
            const celyText = (klic + ') ' + popis).replace(/'/g, "\\'").replace(/"/g, '&quot;');

            return '<button type="button" class="kk-volba' + (isSpecial ? ' kk-volba-x' : '') + '" '
                + 'onclick="this.dispatchEvent(new CustomEvent(\'kk-volba\', {bubbles:true, detail:\'' + celyText + '\'}))">'
                + klic + ') ' + popis
                + '</button>';
        }).join('') + '</div>';
    });

    // Markdown: **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Odrážkové seznamy (• nebo -)
    html = html.replace(/\n([•\-]\s)/g, '\n<li style="margin-left:12px;list-style:disc">');
    // Nadpisy (###, ##)
    html = html.replace(/\n###\s(.+)/g, '\n<strong style="font-size:12px">$1</strong>');
    html = html.replace(/\n##\s(.+)/g, '\n<strong style="font-size:13px">$1</strong>');
    // Newlines
    html = html.replace(/\n/g, '<br>');

    return html;
}

/**
 * Scrolluje chat box dolů — s krátkým delay pro DOM update.
 * @param {HTMLElement} box - element s overflow-y: auto (x-ref="chatBox")
 */
function kkScrollChat(box) {
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 150);
}
