import {useEffect,useState,} from "react";

import {EditorContent,useEditor,useEditorState,} from "@tiptap/react";
import Image from "@tiptap/extension-image";

import StarterKit from "@tiptap/starter-kit";

import {TextStyleKit,} from "@tiptap/extension-text-style";

import {Placeholder,} from "@tiptap/extensions";
import {ref,uploadBytes,getDownloadURL,} from "firebase/storage";

import {
  storage
} from "../firebase.js";

/*
  Allows existing string notes to load
  safely into the new editor.

  We build JSON ourselves instead of
  treating the old string as HTML.
*/
function normalizeContent(value) {
  /*
    Already converted to Tiptap JSON.
  */
  if (
    value &&
    typeof value === "object" &&
    value.type === "doc"
  ) {
    return value;
  }


  /*
    Old textarea value.
  */
  const text =
    typeof value === "string"
      ? value
      : "";


  return {
    type: "doc",

    content: text
      .split("\n")
      .map((line) => {
        if (!line) {
          return {
            type: "paragraph",
          };
        }

        return {
          type: "paragraph",

          content: [
            {
              type: "text",
              text: line,
            },
          ],
        };
      }),
  };
}


export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write notes...",
  cardid
}) {
  const [
    contentError,
    setContentError,
  ] = useState(false);


  //Function to uplaod image
  const uploadImageFile =
  async (file) => {
    if (!file || !cardid) {
      return null;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      return null;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      window.alert(
        "Image must be under 10 MB."
      );

      return null;
    }

    const safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const imageRef =
      ref(
        storage,
        `card-images/${cardid}/${crypto.randomUUID()}-${safeName}`
      );

    await uploadBytes(
      imageRef,
      file,
      {
        contentType:
          file.type,
      }
    );

    return await getDownloadURL(
      imageRef
    );
  };

  const editor = useEditor({
    /*
      Keep the schema intentionally small.

      We are not trying to build Word.
    */
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,

        bulletList: false,
        orderedList: false,

        code: false,
        codeBlock: false,

        strike: false,
        link: false,

        horizontalRule: false,
      }),

      TextStyleKit.configure({
        backgroundColor: false,
        fontFamily: false,
        lineHeight: false,
      }),

      Placeholder.configure({
        placeholder,
      }),

      //Add extension for images
      Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: {
      class: "note-image",
    },
  })
    ],


    /*
      Handles both:
      - existing plain strings
      - new Tiptap JSON
    */
    content:
      normalizeContent(value),


    /*
      Tiptap validates stored JSON
      against our editor schema.
    */
    enableContentCheck: true,


    editorProps: {
        
      attributes: {
        class: "rich-text-content",

        spellcheck: "true",
      },
      handlePaste: (view, event) => {
  const clipboard = event.clipboardData;

  if (!clipboard) {
    return false;
  }

  const imageFile = Array.from(
    clipboard.files || []
  ).find((file) =>
    file.type.startsWith("image/")
  );

  const imageItem = Array.from(
    clipboard.items || []
  ).find((item) =>
    item.type.startsWith("image/")
  );

  const file =
    imageFile ||
    imageItem?.getAsFile();

  if (!file) {
    return false;
  }

  event.preventDefault();

  uploadImageFile(file)
    .then((downloadURL) => {
      if (!downloadURL) {
        return;
      }

      const imageNode =
        view.state.schema.nodes.image;

      if (!imageNode) {
        console.error(
          "Image node is not registered."
        );
        return;
      }

      const transaction =
        view.state.tr.replaceSelectionWith(
          imageNode.create({
            src: downloadURL,
            alt:
              file.name ||
              "Pasted image",
          })
        );

      view.dispatch(transaction);
      view.focus();
    })
    .catch((error) => {
      console.error(
        "Pasted image upload failed:",
        error
      );

      window.alert(
        "Could not upload pasted image."
      );
    });

  return true;
},
    },
    
    

    /*
      Every edit gives CardPage the
      complete JSON document.
    */
    onUpdate: ({ editor }) => {
      onChange(
        editor.getJSON()
      );
    },


    /*
      Important safety behavior:

      If stored content is somehow
      incompatible with the editor,
      don't let editing overwrite it.
    */
    onContentError: ({
      editor,
      error,
    }) => {
      console.error(
        "Invalid rich text content:",
        error
      );

      setContentError(true);

      editor.setEditable(false);
    },
  });

  const uploadImage =
  async (file) => {
    if (!editor) {
      return;
    }

    try {
      const downloadURL =
        await uploadImageFile(
          file
        );

      if (!downloadURL) {
        return;
      }

      editor
        .chain()
        .focus()
        .setImage({
          src:
            downloadURL,

          alt:
            file.name,
        })
        .run();

    } catch (error) {
      console.error(
        "Image upload failed:",
        error
      );

      window.alert(
        "Could not upload image."
      );
    }
  };
const editorState =
  useEditorState({
    editor,

    selector: ({
      editor: currentEditor,
    }) => ({
      isBold:
        currentEditor
          ?.isActive("bold") ??
        false,

      isItalic:
        currentEditor
          ?.isActive("italic") ??
        false,

      isUnderline:
        currentEditor
          ?.isActive("underline") ??
        false,
    }),
  });

  
  /*
    Your CardPage can replace its state
    after loading Firestore.

    useEditor's initial `content` alone
    would NOT be enough for that.

    This keeps the editor synchronized
    with an externally loaded value,
    without triggering another save.
  */
  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent =
      normalizeContent(value);

    const currentContent =
      editor.getJSON();


    if (
      JSON.stringify(
        currentContent
      ) !==
      JSON.stringify(
        nextContent
      )
    ) {
      editor.commands.setContent(
        nextContent,
        {
          emitUpdate: false,
        }
      );
    }
  }, [
    editor,
    value,
  ]);


  if (!editor) {
    return null;
  }


  return (
    <div className="rich-text-editor">

      <div className="rich-text-toolbar">

        <button
          type="button"
          className={`card-page-button editor-tool  ${
           editorState.isBold
            ? "active"
            : ""
          }`
        }
          onMouseDown={(e) => {
            e.preventDefault();

            editor
              .chain()
              .focus()
              .toggleBold()
              .run();
          }}
          title="Bold"
        >
          <strong>B</strong>
        </button>


        <button
          type="button"
          className={`card-page-button editor-tool  ${
           editorState.isItalic
            ? "active"
            : ""
          }`
        }
          onMouseDown={(e) => {
            e.preventDefault();

            editor
              .chain()
              .focus()
              .toggleItalic()
              .run();
          }}
          title="Italic"
        >
          <em>I</em>
        </button>


        <button
          type="button"
          className={`card-page-button editor-tool  ${
            editorState.isUnderline
                ? "active"
                : ""
          }`
        }
          onMouseDown={(e) => {
            e.preventDefault();

            editor
              .chain()
              .focus()
              .toggleUnderline()
              .run();
          }}
          title="Underline"
        >
          <u>U</u>
        </button>


        <input
        className="editor-color"
          type="color"
          defaultValue="#ffffff"
          title="Text color"
          onChange={(e) => {
            editor
              .chain()
              .focus()
              .setColor(
                e.target.value
              )
              .run();
          }}
        />


        <button
          type="button"
          className={`card-page-button editor-tool ${
            editor.isActive("something") ? "active" : ""
        }`}
                onMouseDown={(e) => {
                    e.preventDefault();

                    editor
                    .chain()
                    .focus()
                    .unsetColor()
                    .run();
                }}
                title="Reset text color"
                
                >
                A↺
                </button>

        <label
  className="card-page-button editor-tool image-upload-button"
  title="Add image"
>
  🖼️

  <input
    type="file"
    accept="image/*"
    hidden
    onChange={async (e) => {
      const file =
        e.target.files?.[0];

      if (file) {
        await uploadImage(
          file
        );
      }

      e.target.value = "";
    }}
  />
</label>
        <select
          defaultValue=""
          className="editor-select"
          aria-label="Font size"
          onChange={(e) => {
            const size =
              e.target.value;

            if (!size) {
              editor
                .chain()
                .focus()
                .unsetFontSize()
                .run();

              return;
            }

            editor
              .chain()
              .focus()
              .setFontSize(size)
              .run();
          }}
        >
          <option value="">
            Normal
          </option>

          <option value="13px">
            Small
          </option>

          <option value="16px">
            Normal
          </option>

          <option value="20px">
            Large
          </option>

          <option value="24px">
            Extra Large
          </option>
        </select>

      </div>


      {contentError && (
        <div className="rich-text-error">
          This note could not be loaded
          safely. Editing has been disabled
          so the stored data is not overwritten.
        </div>
      )}


      <EditorContent
        editor={editor}
      />

    </div>
  );
}