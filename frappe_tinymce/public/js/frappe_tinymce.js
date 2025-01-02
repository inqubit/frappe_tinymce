
frappe.ui.form.ControlTextEditor = class ControlTextEditor extends frappe.ui.form.ControlCode {
    make_wrapper() {
        super.make_wrapper();
    }

    make_input() {
        this.has_input = true;
        this.make_quill_editor();
    }

    make_quill_editor() {
        // if (this.quill) return;
        // this.quill = new Quill(this.quill_container[0], this.get_quill_options());
        // this.bind_events();
        const that = this
        this.quill_container = $('<div>').appendTo(this.input_area);
        
        tinymce.PluginManager.add('case',
            function (editor) {

            const strings = {
                TOOLNAME: 'Change Case',
                LOWERCASE: 'lowercase',
                UPPERCASE: 'UPPERCASE',
                SENTENCECASE: 'Sentence case',
                TITLECASE: 'Title Case'
            }, defaultTitleCaseExeptions = [
                'at', 'by', 'in', 'of', 'on', 'up', 'to', 'en', 're', 'vs',
                'but', 'off', 'out', 'via', 'bar', 'mid', 'per', 'pro', 'qua', 'til',
                'from', 'into', 'unto', 'with', 'amid', 'anit', 'atop', 'down', 'less', 'like', 'near', 'over', 'past', 'plus', 'sans', 'save', 'than', 'thru', 'till', 'upon',
                'for', 'and', 'nor', 'but', 'or', 'yet', 'so', 'an', 'a', 'some', 'the'
            ], getParameterArray = function (param) {
                let value = editor.getParam(param);
                if (value) {
                    if (Array.isArray(value)) {
                        return value;
                    } else if (typeof value === "string") {
                        return value.replace(/(\s{1,})/g, "?").trim().split('?');
                    }
                }
                if (param === 'title_case_minors') {
                    return defaultTitleCaseExeptions
                }
                return false
            }

            var titleCaseExceptions = getParameterArray('title_case_minors'),
                toInclude = getParameterArray('include_to_title_case_minors'),
                toRuleOut = getParameterArray('rule_out_from_title_case_minors');
            if (toInclude) {
                toInclude.forEach((el) => {
                    if (defaultTitleCaseExeptions.indexOf(el) === -1) {
                        defaultTitleCaseExeptions.push(el)
                    }
                })
            }
            if (toRuleOut) {
                toRuleOut.forEach((el) => {
                    defaultTitleCaseExeptions = defaultTitleCaseExeptions.filter(minor => minor !== el)
                })
            }
            /*
              * Appending new functions to String.prototype...
              */
            String.prototype.toSentenceCase = function () {
                return this.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, function (c) {
                    return c.toUpperCase()
                });
            }
            String.prototype.toTitleCase = function () {
                let tt = (str) => {
                    let s = str.split('.'), w;
                    for (let i in s) {
                        let w = s[i].split(' '),
                            j = 0;

                        if (s[i].trim().replace(/(^\s+|\s+$)/g, "").length > 0) {
                            for (j; j < w.length; j++) {
                                let found = false;
                                for (let k = 0; k < w[j].length; k++) {
                                    if (w[j][k].match(/([a-z'áàâãäéèêëíìîïóòôõöúùûü])/i)) {
                                        w[j] = w[j][k].toUpperCase() + w[j].slice(k + 1);
                                        found = true;
                                        break;
                                    }
                                }
                                if (found) {
                                    break;
                                }
                            }
                            for (j; j < w.length; j++) {
                                if (titleCaseExceptions.indexOf(w[j]) === -1) {
                                    for (let k = 0; k < w[j].length; k++) {
                                        if (w[j][k].match(/([a-z'áàâãäéèêëíìîïóòôõöúùûü])/i)) {
                                            w[j] = w[j][k].toUpperCase() + w[j].slice(k + 1);
                                            break;
                                        }
                                    }
                                }
                            }
                            s[i] = w.join(' ');
                        }
                    }
                    return s.join('.');
                };
                return tt(this.toLowerCase());
            }

            String.prototype.apply = function (method) {
                switch (method) {
                    case strings.LOWERCASE:
                        return this.toLowerCase();
                    case strings.UPPERCASE:
                        return this.toUpperCase();
                    case strings.SENTENCECASE:
                        return this.toSentenceCase();
                    case strings.TITLECASE:
                        return this.toTitleCase();
                    default:
                        return this;
                }
            }

            const handler = function (node, method, r) {
                console.log(r);
                if (r.first && r.last) {
                    node.textContent = node.textContent.slice(0, r.startOffset) + node.textContent.slice(r.startOffset, r.endOffset).apply(method) + node.textContent.slice(r.endOffset);
                } else if (r.first && !r.last) {
                    node.textContent = node.textContent.slice(0, r.startOffset) + node.textContent.slice(r.startOffset).apply(method);
                } else if (!r.first && r.last) {
                    node.textContent = node.textContent.slice(0, r.endOffset).apply(method) + node.textContent.slice(r.endOffset);
                } else {
                    node.textContent = node.textContent.apply(method);
                }
            }

            const apply = function (method) {
                let rng = editor.selection.getRng(),
                    bm = editor.selection.getBookmark(2, true),
                    walker = new tinymce.dom.TreeWalker(rng.startContainer),
                    first = rng.startContainer,
                    last = rng.endContainer,
                    startOffset = rng.startOffset,
                    endOffset = rng.endOffset,
                    current = walker.current();

                console.log('RANGE', rng);
                do {
                    if (current.nodeName === '#text') {
                        console.log('CURRENT', current);
                        handler(current, method, {
                            first: current === first,
                            last: current === last,
                            startOffset: startOffset,
                            endOffset: endOffset
                        });
                    }
                    if (current === last) {
                        break;
                    }
                    current = walker.next();
                } while (current);
                editor.save();
                editor.isNotDirty = true;
                editor.focus();
                editor.selection.moveToBookmark(bm);

                // Clear out the HTML inside the mce_0 div, which renders just under the Frappe Control's label.
                $('#mce_0').html('')
            }

            const getMenuItems = function () {
                return [
                    {
                        type: "menuitem",
                        text: strings.LOWERCASE,
                        //onAction: lowerCase()
                        onAction: () => apply(strings.LOWERCASE)
                    },
                    {
                        type: "menuitem",
                        text: strings.UPPERCASE,
                        //onAction: upperCase()
                        onAction: () => apply(strings.UPPERCASE)
                    },
                    {
                        type: "menuitem",
                        text: strings.SENTENCECASE,
                        //onAction: sentenceCase()
                        onAction: () => apply(strings.SENTENCECASE)
                    },
                    {
                        type: "menuitem",
                        text: strings.TITLECASE,
                        //onAction: titleCase()
                        onAction: () => apply(strings.TITLECASE)
                    }
                ]
            }

            const getMenuButton = function () {
                return {
                    icon: 'change-case',
                    tooltip: strings.TOOLNAME,
                    fetch: function (callback) {
                        const items = getMenuItems();
                        callback(items);
                    }
                }
            }

            const getNestedMenuItem = function () {
                return {
                    text: strings.TOOLNAME,
                    getSubmenuItems: () => {
                        return getMenuItems();
                    }
                }
            }

            editor.ui.registry.addMenuButton('case', getMenuButton());
            editor.ui.registry.addNestedMenuItem('case', getNestedMenuItem());

            editor.addCommand('mceLowerCase', () => apply(strings.LOWERCASE));
            editor.addCommand('mceUpperCase', () => apply(strings.UPPERCASE));
            editor.addCommand('mceSentenceCase', () => apply(strings.SENTENCECASE));
            editor.addCommand('mceTitleCase', () => apply(strings.TITLECASE));
        });

        tinymce.PluginManager.add('customTemplate', function (editor) {
            // var menuToggle = false;
            // var menuToggle1 = false;
            console.log("ADDING PLUGIN customTemplate")
            editor.ui.registry.addMenuButton('customTemplate', {
                text: 'Custom Template',
                fetch: function (callback) {
                    var items = [
                        {
                            type: 'menuitem',
                            text: 'Scheda Incentivo Semplificata',
                            onAction: function () {
                                // if(menuToggle === false) {
                                //     menuToggle = !menuToggle;
                                //     menuToggle1 = !menuToggle1;
                                editor.insertContent(`
                                      <p>
                                          <b>Obiettivo</b>
                                      </p>
                                      <p>
                                          <b>Beneficiari</b>
                                      </p>
                                      <p>
                                          <b>Interventi ammissibili</b>
                                      </p>
                                      <p>
                                          <b>Tempi e scadenze</b>
                                      </p>
                                      <p>
                                          <b>Aggiornamenti e Link</b>
                                      </p>
                                  `);
                                // }else {
                                //     tinymce.activeEditor.windowManager.confirm("Do you want to replace template.");
                                // }
                            },
                        },
                        {
                            type: 'menuitem',
                            text: 'Scheda Incentivo Completa',
                            onAction: function () {
                                // if(menuToggle1 === false) {
                                //     menuToggle1 = !menuToggle1;
                                //     menuToggle = !menuToggle;
                                editor.insertContent(`
                                      <p>
                                          <b>Obiettivo</b>
                                      </p>
                                      <p>
                                          <b>Beneficiari</b>
                                      </p>
                                      <p>
                                          <b>Interventi ammissibili</b>
                                      </p>
                                      <p>
                                          <b>Budget e Tipologia di incentivo</b>
                                      </p>
                                      <p>
                                          <b>Tempi e scadenze</b>
                                      </p>
                                      <p>
                                          <b>Aggiornamenti e Link</b>
                                      </p>
                                  `);
                                // } else {
                                //     tinymce.activeEditor.windowManager.confirm("Do you want to replace template.");
                                // }
                            },
                        }
                    ];
                    callback(items);
                }
            });
        });

        tinymce.init({
            target: this.input_area,
            toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize blocks | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist checklist | forecolor backcolor casechange permanentpen formatpainter removeformat | pagebreak | charmap emoticons | fullscreen  preview save print | insertfile image media pageembed template link anchor codesample | a11ycheck ltr rtl | showcomments addcomment | footnotes | mergetags | customHRButton | case | customTemplate ',
            font_size_formats: '10px 11px 12px 14px 15px 16px 18px 24px 36px',
            plugins: [
              'autolink', 'charmap', 'emoticons', 'fullscreen', 'help',
              'image', 'link', 'lists', 'searchreplace',
              'table', 'visualblocks', 'visualchars', 'wordcount', 'media', 'anchor', 'case', 
              'customTemplate'
            ],
            powerpaste_googledocs_import: "prompt",
            entity_encoding: 'raw',
            convert_urls: true,
            content_css: false,
            toolbar_sticky: true,
            promotion: false,
            default_link_target: "_blank",
            height: 500,
            setup: function(editor) {
                that.editor_id = editor.id
                editor.ui.registry.addButton('customHRButton', {
                    icon: 'horizontal-rule',
                    tooltip: 'Insert Horizontal Rule',
                    onAction: function (_) {
                        editor.selection.setContent('<hr/>');
                    }
                });
                editor.on('Change', function(e) {
                    that.parse_validate_and_set_in_model(e.level.content);
                });
                editor.on('init', function (e) {
                    editor.setContent(that.value || "");
                    
                    // Fix the z index to prevent overlapping the link field dropdown.
                    let tinyMCEContainer = $('.tox-editor-container');
                    tinyMCEContainer.css('z-index', 0);
                    console.log("tinyMCEContainer", tinyMCEContainer);
                });
            }
        });
        this.activeEditor = tinymce.activeEditor
    }

    set_formatted_input(value) {
        if (!this.frm) return;

        if (!value) {
            this.activeEditor.setContent("");
            return;
        }

        let bookmark = this.activeEditor.selection ? this.activeEditor.selection.getBookmark(2, true) : null;
        
        this.activeEditor.setContent(value);

        if (bookmark) {
            this.activeEditor.selection.moveToBookmark(bookmark);
        }
    }

    get_input_value() {
        return this.activeEditor.getContent()
    }
}
