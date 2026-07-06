document.addEventListener('DOMContentLoaded', () => {
    const notebook = document.getElementById('study-notebook');
    const vocabSection = document.getElementById('vocab-section');
    const cardsContainer = document.getElementById('vocab-cards-container');

    if (!notebook || !vocabSection || !cardsContainer) return;

    // Exact parameter tracking configuration matching user payload specifications
    const userId = vocabSection.getAttribute('data-user-id');
    const videoId = vocabSection.getAttribute('data-video-id');
    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    let notebookDebounceTimeout = null;
    let detailedNoteId = null; // Track the backend note_id dynamically

    // ==========================================
    // PHASE 1: Page Initialization & Hydration
    // ==========================================
    function loadWorkspaceState() {
        // Hits the workspace landing point configuration
        fetch(`${API_BASE}/workspace/load-page?user_id=${userId}&video_id=${videoId}`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(data => {
                const notes = data.workspace?.notes || [];

                // --- 1. Hydrate Detailed Analysis Notebook ---
                const detailedNote = notes.find(n => n.type === "detailed_analysis");
                if (detailedNote) {
                    detailedNoteId = detailedNote.note_id;
                    notebook.innerText = detailedNote.content;
                } else {
                    notebook.innerHTML = `Start typing your detailed analysis here...<br/><br/>• Key grammar points:<br/>• Cultural context:`;
                }

                // --- 2. Hydrate Quick Vocabulary Card Matrix ---
                cardsContainer.innerHTML = ''; // Clear fallback states
                const vocabNotes = notes.filter(n => n.type === "single_word_vocab");

                if (vocabNotes.length === 0) {
                    cardsContainer.innerHTML = `<p class="text-sm text-on-surface-variant italic p-sm col-span-full">No flashcard terms generated yet for this review module.</p>`;
                } else {
                    vocabNotes.forEach(vocab => {
                        appendVocabCardDOM(vocab);
                    });
                }
            })
            .catch(() => {
                notebook.innerText = "Error pulling cloud sync records.";
                cardsContainer.innerHTML = `<p class="text-sm text-error font-medium p-sm col-span-full">Failed to connect to local database parameters.</p>`;
            });
    }

    // Helper to stitch dynamic HTML nodes to vocabulary panel layout
    function appendVocabCardDOM(vocab) {
        const card = document.createElement('div');
        const isActive = vocab.user_custom_definition ? "active" : "group";
        const textClass = vocab.user_custom_definition ? "active-text" : "";

        card.className = `vocab-input-card ${isActive} relative group/card flex flex-col justify-between p-md min-h-[160px]`;
        card.setAttribute('data-note-id', vocab.note_id);
        card.setAttribute('data-character', vocab.character);

        // Parse pre-existing children if they exist in the DB object row
        let childrenHTML = '';
        if (vocab.children_notes && vocab.children_notes.length > 0) {
            vocab.children_notes.forEach(child => {
                childrenHTML += createChildRowHTML(child.note_id, child.character, child.user_custom_definition);
            });
        }

        card.innerHTML = `
          <div class="absolute top-1 right-2 flex items-center gap-xs opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-10">
            <button class="add-child-btn text-xs text-primary hover:underline font-bold cursor-pointer p-xs select-none" title="Add related word">
              + Sub
            </button>
            <button class="delete-vocab-btn text-outline hover:text-error font-bold text-sm cursor-pointer p-xs select-none" title="Delete main word">
              ✕
            </button>
          </div>

          <div class="flex flex-col items-center w-full">
            <span class="vocab-character ${textClass}">${vocab.character}</span>
            <span class="breadcrumb-item ${vocab.user_custom_definition ? 'text-on-secondary-fixed-variant' : 'text-on-surface-variant'}">${vocab.pinyin || '---'}</span>
            <input class="w-full text-center bg-transparent border-none focus:ring-0 font-body-md p-0 placeholder:text-outline ${vocab.user_custom_definition ? 'text-on-surface font-bold' : ''}" 
                   placeholder="Meaning..." 
                   type="text" 
                   value="${vocab.user_custom_definition || ''}"/>
          </div>

          <div class="child-notes-container w-full border-t border-outline/30 mt-sm pt-sm flex flex-col gap-xs text-xs">
            ${childrenHTML}
          </div>
        `;
        cardsContainer.appendChild(card);
    }

    function createChildRowHTML(childId, character = '', meaning = '', isDraft = false) {
        return `
          <div class="child-note-row flex items-center justify-between gap-xs w-full bg-surface-container-low px-xs py-[2px] rounded" 
               data-child-id="${childId}" ${isDraft ? 'data-is-child-draft="true"' : ''}>
            ${isDraft ? `
              <input class="child-char-input font-bold bg-transparent border-b border-outline w-12 text-left p-0 focus:ring-0 text-xs" placeholder="Word" type="text" value="${character}"/>
              <input class="child-meaning-input bg-transparent border-none w-full text-left p-0 focus:ring-0 text-xs text-on-surface-variant" placeholder="Meaning..." type="text" value="${meaning}"/>
            ` : `
              <span class="font-bold text-primary">${character}</span>
              <input class="child-meaning-input bg-transparent border-none w-full text-left p-0 focus:ring-0 text-xs text-on-surface-variant" type="text" value="${meaning}" placeholder="Add sub meaning..."/>
              <button class="delete-child-btn text-[10px] text-outline hover:text-error cursor-pointer px-xs select-none">✕</button>
            `}
          </div>
        `;
    }

    // ==========================================
    // PHASE 2: Detailed Notebook Sync (Debounced UPDATE/ADD)
    // ==========================================
    notebook.addEventListener('input', (e) => {
        clearTimeout(notebookDebounceTimeout);
        const textContents = e.target.innerText;

        notebookDebounceTimeout = setTimeout(() => {
            console.log("⚡ Syncing Detailed Notebook...");

            const isNewNote = (detailedNoteId === null);
            const payload = {
                action: isNewNote ? "ADD" : "UPDATE",
                note_id: detailedNoteId,
                type: "detailed_analysis",
                timestamp: "00:00",
                content: textContents
            };

            fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(result => {
                    if (result.status === "success" && isNewNote) {
                        detailedNoteId = result.note_id; // Store runtime generated index key tracking marker
                    }
                    console.log("✅ Notebook state synchronized smoothly.");
                })
                .catch(err => console.error("❌ Notebook synchronization error:", err));
        }, 1200); // 1.2 second debounce threshold delay
    });

    // ==========================================
    // PHASE 3: Vocabulary Card Sync (On Enter Key)
    // ==========================================
    cardsContainer.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;

        const inputElement = e.target;
        const cardElement = inputElement.closest('.vocab-input-card');
        const childRow = inputElement.closest('.child-note-row');

        const parentId = cardElement?.getAttribute('data-note-id');
        const isDraft = cardElement.getAttribute('data-is-draft') === 'true';

        let payload = {};

        // ----------------------------------------------------
        // BRANCH A: Handling Nested Sub-note Input Matrices
        // ----------------------------------------------------
        if (childRow) {
            const isChildDraft = childRow.getAttribute('data-is-child-draft') === 'true';
            const childMeaningInput = childRow.querySelector('.child-meaning-input');
            const targetMeaning = childMeaningInput.value.trim();

            if (isChildDraft) {
                const childCharInput = childRow.querySelector('.child-char-input');
                const targetChar = childCharInput.value.trim();
                if (!targetChar) return;

                const payload = {
                    action: "ADD",
                    parent_note_id: parentId, // Binds operation to parent document structure
                    type: "single_word_vocab",
                    character: targetChar,
                    user_custom_definition: targetMeaning
                };

                fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(res => res.json())
                    .then(resData => {
                        if (resData.status === "success") {
                            // Transform the child rows draft shell into normal operational rows live
                            childRow.innerHTML = `
                          <span class="font-bold text-primary">${targetChar}</span>
                          <input class="child-meaning-input bg-transparent border-none w-full text-left p-0 focus:ring-0 text-xs text-on-surface-variant" type="text" value="${targetMeaning}" placeholder="Add sub meaning..."/>
                          <button class="delete-child-btn text-[10px] text-outline hover:text-error cursor-pointer px-xs select-none">✕</button>
                        `;
                            childRow.setAttribute('data-child-id', resData.note_id);
                            childRow.removeAttribute('data-is-child-draft');
                        }
                    });
            } else {
                // Regular inline UPDATE execution for an existing child node row field
                const childId = childRow.getAttribute('data-child-id');
                const payload = {
                    action: "UPDATE",
                    note_id: childId,
                    parent_note_id: parentId,
                    user_custom_definition: targetMeaning
                };

                inputElement.blur();
                fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            return;
        }

        if (isDraft) {
            // ==========================================
            // CASE A: Processing an Inline Draft Card (ADD)
            // ==========================================
            const charInput = cardElement.querySelector('.vocab-character-input');
            const meaningInput = cardElement.querySelector('.vocab-meaning-input');

            const characterValue = charInput.value.trim();
            const meaningValue = meaningInput.value.trim();

            if (!characterValue) {
                charInput.classList.add('border-error');
                return; // Prevent saving completely blank strings
            }

            payload = {
                action: "ADD",
                type: "single_word_vocab",
                character: characterValue,
                user_custom_definition: meaningValue,
                mastery_status: meaningValue ? "learning" : "unstarted"
            };

            // Lock UI states during execution processing loops
            charInput.disabled = true;
            meaningInput.disabled = true;
            cardElement.classList.remove('animate-pulse');

            fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => { if (!res.ok) throw new Error(); return res.json(); })
                .then(result => {
                    if (result.status === "success") {
                        // Redraw this single card slot into a permanent standard card block asset
                        cardElement.className = meaningValue ? "vocab-input-card active" : "vocab-input-card group";
                        cardElement.removeAttribute('data-is-draft');
                        cardElement.setAttribute('data-note-id', result.note_id);
                        cardElement.setAttribute('data-character', characterValue);

                        cardElement.innerHTML = `
          <span class="vocab-character ${meaningValue ? 'active-text' : ''}">${characterValue}</span>
          <span class="breadcrumb-item ${meaningValue ? 'text-on-secondary-fixed-variant' : 'text-on-surface-variant'}">---</span>
          <input class="w-full text-center bg-transparent border-none focus:ring-0 font-body-md p-0 placeholder:text-outline ${meaningValue ? 'text-on-surface font-bold' : ''}" 
                 placeholder="Meaning..." 
                 type="text" 
                 value="${meaningValue}"/>
        `;
                        console.log(`✅ Fresh inline card saved: ${characterValue}`);
                    }
                })
                .catch(() => {
                    charInput.disabled = false;
                    meaningInput.disabled = false;
                    cardElement.classList.add('border-error');
                });

        } else {
            // ==========================================
            // CASE B: Standard Card Modification (UPDATE)
            // ==========================================
            const targetValue = inputElement.value.trim();
            const noteId = cardElement.getAttribute('data-note-id');
            const character = cardElement.getAttribute('data-character');

            inputElement.blur();
            inputElement.style.opacity = '0.5';

            payload = {
                action: "UPDATE",
                note_id: noteId,
                type: "single_word_vocab",
                character: character,
                user_custom_definition: targetValue,
                mastery_status: targetValue ? "learning" : "unstarted"
            };

            fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => { if (!res.ok) throw new Error(); return res.json(); })
                .then(result => {
                    if (result.status === "success") {
                        inputElement.style.opacity = '1';
                        if (targetValue) {
                            cardElement.className = "vocab-input-card active";
                            cardElement.querySelector('.vocab-character').className = "vocab-character active-text";
                            inputElement.className = "w-full text-center bg-transparent border-none focus:ring-0 font-body-md p-0 text-on-surface font-bold";
                        } else {
                            cardElement.className = "vocab-input-card group";
                            cardElement.querySelector('.vocab-character').className = "vocab-character";
                            inputElement.className = "w-full text-center bg-transparent border-none focus:ring-0 font-body-md p-0 placeholder:text-outline";
                        }
                    }
                })
                .catch(() => {
                    inputElement.style.opacity = '1';
                    inputElement.style.borderBottom = '2px solid red';
                });
        }
    });

    cardsContainer.addEventListener('click', (e) => {
        const addChildBtn = e.target.closest('.add-child-btn');
        const deleteChildBtn = e.target.closest('.delete-child-btn');

        // Handler Hook 1: Trigger Sub-term Inline Drafts Creation
        if (addChildBtn) {
            const card = addChildBtn.closest('.vocab-input-card');
            const childContainer = card.querySelector('.child-notes-container');

            // Create a randomized client key variable reference tag temporarily
            const tempId = `TEMP_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            childContainer.insertAdjacentHTML('beforeend', createChildRowHTML(tempId, '', '', true));
            childContainer.querySelector('.child-char-input').focus();
            return;
        }

        // Handler Hook 2: Trigger Sub-term Atomic Purge Requests
        if (deleteChildBtn) {
            const card = deleteChildBtn.closest('.vocab-input-card');
            const row = deleteChildBtn.closest('.child-note-row');

            const parentId = card.getAttribute('data-note-id');
            const childId = row.getAttribute('data-child-id');

            row.style.opacity = '0.3';
            fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "DELETE", note_id: childId, parent_note_id: parentId })
            })
                .then(res => res.json())
                .then(() => row.remove());
            return;
        }

        // Target clicks that land on our custom delete button element
        const deleteBtn = e.target.closest('.delete-vocab-btn');
        if (!deleteBtn) return;

        const cardElement = deleteBtn.closest('.vocab-input-card');
        const noteId = cardElement.getAttribute('data-note-id');
        const character = cardElement.getAttribute('data-character');

        // 1. If it's just a blank draft card that hasn't been saved to DB yet, drop it immediately
        if (cardElement.getAttribute('data-is-draft') === 'true') {
            cardElement.remove();
            checkEmptyStateFallback();
            return;
        }

        // Confirm execution before running the network drop command
        if (!confirm(`Are you sure you want to remove "${character}" from your workspace notes?`)) return;

        // Gray out card to provide instant visual feedback during the network roundtrip
        cardElement.style.pointerEvents = 'none';
        cardElement.style.opacity = '0.4';

        const payload = {
            action: "DELETE",
            note_id: noteId
        };

        // 2. Fire the DELETE operation straight to the backend path
        fetch(`${API_BASE}/workspace/${userId}/${videoId}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(result => {
                if (result.status === "success") {
                    console.log(`❌ Note expunged successfully from DDB array: ${noteId}`);

                    // 3. Animate out and remove the HTML element from the DOM tree
                    cardElement.classList.add('scale-95', 'opacity-0', 'transition-all', 'duration-200');
                    setTimeout(() => {
                        cardElement.remove();
                        checkEmptyStateFallback();
                    }, 200);
                }
            })
            .catch(() => {
                // Re-enable UI interaction loop if database connection failures manifest
                cardElement.style.pointerEvents = 'auto';
                cardElement.style.opacity = '1';
                alert("Failed to delete the card. Verify backend synchronization integrity layers.");
            });
    });

    // Boot hydration sequence processes immediately
    loadWorkspaceState();

    // Place this inside your DOMContentLoaded wrapper in js/workspace.js
    const addVocabBtn = document.getElementById('add-vocab-btn');

    addVocabBtn.addEventListener('click', () => {
        // 1. Clear out empty/fallback text descriptors if they are present
        if (cardsContainer.querySelector('p.italic')) {
            cardsContainer.innerHTML = '';
        }

        // 2. Programmatically generate a temporary placeholder card state
        const draftCard = document.createElement('div');
        draftCard.className = "vocab-input-card active border-2 border-dashed border-primary animate-pulse";
        draftCard.setAttribute('data-is-draft', 'true'); // Flag to tell Enter-key handler to use "ADD"

        draftCard.innerHTML = `
    <input class="vocab-character-input text-center bg-transparent border-b border-outline focus:border-primary focus:ring-0 font-bold text-lg p-0 w-20 placeholder:text-sm placeholder:font-normal" 
           placeholder="字 / 词" 
           type="text" 
           id="draft-character-field"/>
    <span class="breadcrumb-item text-on-surface-variant">---</span>
    <input class="vocab-meaning-input w-full text-center bg-transparent border-none focus:ring-0 font-body-md p-0 placeholder:text-outline" 
           placeholder="Meaning..." 
           type="text" 
           id="draft-meaning-field"/>
  `;

        // 3. Append to your grid canvas and automatically force user input focus on the character field
        cardsContainer.appendChild(draftCard);
        document.getElementById('draft-character-field').focus();
    });


    // Video Library Collapsible Logic
    const categoryToggles = document.querySelectorAll('.category-toggle');
    categoryToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = toggle.closest('.collapsible-category');
            const list = parent.querySelector('.nested-list');
            const chevron = toggle.querySelector('.chevron');

            // Toggle list visibility
            list.classList.toggle('hidden');

            // Toggle chevron rotation
            if (list.classList.contains('hidden')) {
                chevron.classList.remove('rotate-90');
            } else {
                chevron.classList.add('rotate-90');
            }
        });
    });

    // Floating Action Button logic for Quick Notes
    const fab = document.querySelector('button.bg-tertiary');
    if (fab) {
        fab.addEventListener('click', () => {
            alert('Quick Note interface triggered!');
        });
    }

    function checkEmptyStateFallback() {
        if (cardsContainer.children.length === 0) {
            cardsContainer.innerHTML = `<p class="text-sm text-on-surface-variant italic p-sm col-span-full">No flashcard terms generated yet for this review module.</p>`;
        }
    }
});