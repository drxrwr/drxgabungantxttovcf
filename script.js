function parseWithSpasi(text) {
  return (text || "").replace(/§/g, " ").trim();
}

function formatPhoneNumber(num) {
  if (!num) return "";
  if (num.startsWith("+") || num.startsWith("0")) return num;
  return "+" + num;
}

function padNumber(num, totalLength) {
  return num.toString().padStart(totalLength, "0");
}

const uploadArea = document.getElementById("uploadArea");
const txtFileInput = document.getElementById("txtFileInput");
const fileListDiv = document.getElementById("fileList");
let uploadedFiles = [];

uploadArea.addEventListener("click", () => txtFileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () =>
  uploadArea.classList.remove("dragover")
);

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

txtFileInput.addEventListener("change", () =>
  handleFiles(txtFileInput.files)
);

function handleFiles(files) {
  uploadedFiles = [...uploadedFiles, ...Array.from(files)];
  renderFileList();
  readAllFiles();
}

function renderFileList() {
  fileListDiv.innerHTML = uploadedFiles
    .map((f, i) => `<div data-index="${i}">${f.name}</div>`)
    .join("");

  new Sortable(fileListDiv, {
    animation: 150,
    onEnd: readAllFiles,
  });
}

function readAllFiles() {
  if (!uploadedFiles.length) {
    document.getElementById("numberTextArea").value = "";
    document.getElementById("totalNumberInfo").innerText = "Total nomor: 0";
    return;
  }

  let totalNumbers = 0;

  const readers = uploadedFiles.map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = (e.target.result || "")
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l);

        totalNumbers += lines.length;
        resolve(lines);
      };
      reader.readAsText(file);
    });
  });

  Promise.all(readers).then((results) => {
    const allNumbers = results.flat();
    document.getElementById("numberTextArea").value =
      allNumbers.join("\n");
    document.getElementById("totalNumberInfo").innerText =
      `Total nomor: ${totalNumbers}`;
  });
}

document
  .getElementById("splitVCFButton")
  .addEventListener("click", async function () {
    const rawNumbers =
      document.getElementById("numberTextArea").value.trim();

    const nameBase =
      document.getElementById("contactNameInput").value.trim();

    const fixedFileName =
      document.getElementById("fixedFileNameCheckbox").checked;

    const useCustomName =
      document.getElementById("customNameCheckbox").checked;

    let contactsPerFile = parseInt(
      document.getElementById("contactsPerFile").value
    );

    let startNumber = parseInt(
      document.getElementById("startNumberInput").value
    );
    if (isNaN(startNumber)) startNumber = 1;

    const fileNameRaw =
      document.getElementById("splitFileNameInput").value;

    const additionalFileNameRaw =
      document.getElementById("additionalFileNameInput").value;

    if (!rawNumbers) {
      alert("Isi daftar nomor tidak boleh kosong.");
      return;
    }

    const numbers = rawNumbers
      .split(/\r?\n/)
      .map((l) => formatPhoneNumber(l.trim()))
      .filter((l) => l);

    const totalContacts = numbers.length;
    const digitLength = totalContacts.toString().length;

    const outputDiv =
      document.getElementById("splitVcfFiles");
    outputDiv.innerHTML = "";

    const zip = new JSZip();

    let chunks = [];

    if (isNaN(contactsPerFile)) {
      chunks = [numbers];
    } else {
      for (let i = 0; i < numbers.length; i += contactsPerFile) {
        chunks.push(numbers.slice(i, i + contactsPerFile));
      }
    }

    let globalCounter = 0;

    chunks.forEach((chunk, chunkIdx) => {
      let vcfContent = "";

      chunk.forEach((number) => {
        globalCounter++;
        const padded = padNumber(globalCounter, digitLength);

        let contactName;

        if (useCustomName) {
          contactName = `${parseWithSpasi(nameBase)} ${parseWithSpasi(fileNameRaw)} ${padded} ${parseWithSpasi(additionalFileNameRaw)}`.trim();
        } else {
          contactName = nameBase
            ? `${parseWithSpasi(nameBase)} ${padded}`
            : `kontak ${padded}`;
        }

        vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL:${number}
END:VCARD
`;
      });

      let splitFileName;

      if (fixedFileName && uploadedFiles.length) {
        const originalName =
          uploadedFiles[0].name.replace(/\.txt$/i, "");

        if (chunks.length > 1) {
          splitFileName = `${originalName}_${chunkIdx + 1}`;
        } else {
          splitFileName = originalName;
        }
      } else {
        splitFileName =
          parseWithSpasi(fileNameRaw) +
          (startNumber + chunkIdx);
      }

      const additionalNamePart =
        parseWithSpasi(additionalFileNameRaw);

      const finalName = additionalNamePart
        ? `${splitFileName} ${additionalNamePart}`
        : splitFileName;

      const blob = new Blob([vcfContent], {
        type: "text/vcard",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${finalName}.vcf`;
      link.textContent = `Download ${link.download}`;
      outputDiv.appendChild(link);

      zip.file(`${finalName}.vcf`, vcfContent);
    });

    const zipBlob = await zip.generateAsync({
      type: "blob",
    });

    const zipLink = document.createElement("a");
    zipLink.href = URL.createObjectURL(zipBlob);
    zipLink.download = "all_split_vcf.zip";
    zipLink.textContent = "📦 Download Semua (ZIP)";
    zipLink.style.fontWeight = "bold";
    zipLink.style.display = "block";
    zipLink.style.marginTop = "20px";

    outputDiv.appendChild(zipLink);
  });
