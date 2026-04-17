const patientForm = document.getElementById("patientForm");
const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const patientTableBody = document.getElementById("patientTableBody");
const patientCardBoard = document.getElementById("patientCardBoard");
const patientCount = document.getElementById("patientCount");
const messageBox = document.getElementById("message");
const summaryTotal = document.getElementById("summaryTotal");
const summaryAdmitted = document.getElementById("summaryAdmitted");
const summaryAppointment = document.getElementById("summaryAppointment");
const summaryObservation = document.getElementById("summaryObservation");

let editingId = null;
let patientCache = [];

function showMessage(text, isError = false) {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden", "error");
  if (isError) {
    messageBox.classList.add("error");
  }

  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => {
    messageBox.classList.add("hidden");
  }, 3500);
}

function getFormData() {
  return {
    patientId: document.getElementById("patientId").value,
    fullName: document.getElementById("fullName").value,
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    disease: document.getElementById("disease").value,
    doctorAssigned: document.getElementById("doctorAssigned").value,
    admissionDate: document.getElementById("admissionDate").value,
    roomNumber: document.getElementById("roomNumber").value,
    status: document.getElementById("status").value
  };
}

function resetForm() {
  patientForm.reset();
  editingId = null;
  formTitle.textContent = "Add Patient";
  submitButton.textContent = "Save Patient";
  cancelEditButton.classList.add("hidden");
}

function fillForm(patient) {
  editingId = patient._id;
  formTitle.textContent = "Edit Patient";
  submitButton.textContent = "Update Patient";
  cancelEditButton.classList.remove("hidden");

  document.getElementById("patientId").value = patient.patientId || "";
  document.getElementById("fullName").value = patient.fullName || "";
  document.getElementById("age").value = patient.age || "";
  document.getElementById("gender").value = patient.gender || "";
  document.getElementById("phone").value = patient.phone || "";
  document.getElementById("address").value = patient.address || "";
  document.getElementById("disease").value = patient.disease || "";
  document.getElementById("doctorAssigned").value = patient.doctorAssigned || "";
  document.getElementById("admissionDate").value = patient.admissionDate || "";
  document.getElementById("roomNumber").value = patient.roomNumber || "";
  document.getElementById("status").value = patient.status || "Admitted";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "discharged") {
    return "status-pill status-discharged";
  }
  if (normalized === "appointment") {
    return "status-pill status-appointment";
  }
  if (normalized === "under observation") {
    return "status-pill status-observation";
  }
  return "status-pill status-admitted";
}

function updateSummary(patients) {
  const admitted = patients.filter((patient) => patient.status === "Admitted").length;
  const appointments = patients.filter((patient) => patient.status === "Appointment").length;
  const observation = patients.filter((patient) => patient.status === "Under Observation").length;

  summaryTotal.textContent = patients.length;
  summaryAdmitted.textContent = admitted;
  summaryAppointment.textContent = appointments;
  summaryObservation.textContent = observation;
}

function renderPatientCards(patients) {
  if (!patients.length) {
    patientCardBoard.innerHTML = '<article class="patient-card-empty">No patients found.</article>';
    return;
  }

  patientCardBoard.innerHTML = patients.map((patient) => `
    <article class="patient-card">
      <div class="patient-card-top">
        <div>
          <p class="card-id">${escapeHtml(patient.patientId)}</p>
          <h3>${escapeHtml(patient.fullName)}</h3>
        </div>
        <span class="${getStatusClass(patient.status)}">${escapeHtml(patient.status)}</span>
      </div>
      <div class="card-meta">
        <span>${escapeHtml(patient.gender)}</span>
        <span>${escapeHtml(patient.age)} yrs</span>
        <span>${escapeHtml(patient.roomNumber || "No room")}</span>
      </div>
      <p class="card-disease">${escapeHtml(patient.disease)}</p>
      <div class="card-detail">Doctor: ${escapeHtml(patient.doctorAssigned)}</div>
      <div class="card-detail">Phone: ${escapeHtml(patient.phone)}</div>
      <div class="card-detail">Date: ${escapeHtml(formatDate(patient.admissionDate))}</div>
      <div class="card-actions">
        <button class="edit-btn" type="button" data-action="edit" data-id="${patient._id}">Edit</button>
        <button class="delete-btn" type="button" data-action="delete" data-id="${patient._id}">Delete</button>
      </div>
    </article>
  `).join("");
}

function renderPatients(patients) {
  patientCache = patients;
  patientCount.textContent = patients.length;
  updateSummary(patients);
  renderPatientCards(patients);

  if (!patients.length) {
    patientTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No patients found.</td></tr>';
    return;
  }

  patientTableBody.innerHTML = patients.map((patient) => `
    <tr>
      <td>
        <div class="patient-id">${escapeHtml(patient.patientId)}</div>
      </td>
      <td>
        <div class="detail-title">${escapeHtml(patient.fullName)}</div>
        <div class="detail-line">Age: ${escapeHtml(patient.age)} | Gender: ${escapeHtml(patient.gender)}</div>
        <div class="detail-line">Phone: ${escapeHtml(patient.phone)}</div>
        <div class="detail-line">${escapeHtml(patient.address || "Address not provided")}</div>
      </td>
      <td>
        <div class="detail-title">${escapeHtml(patient.disease)}</div>
        <div class="detail-line">Doctor: ${escapeHtml(patient.doctorAssigned)}</div>
        <div class="detail-line">Date: ${escapeHtml(formatDate(patient.admissionDate))}</div>
      </td>
      <td>
        <div class="visit-stack">
          <span class="${getStatusClass(patient.status)}">${escapeHtml(patient.status)}</span>
          <div class="detail-line">Room: ${escapeHtml(patient.roomNumber || "Not assigned")}</div>
          <div class="detail-line">Date: ${escapeHtml(formatDate(patient.admissionDate))}</div>
        </div>
      </td>
      <td>
        <div class="actions">
          <button class="edit-btn" type="button" data-action="edit" data-id="${patient._id}">Edit</button>
          <button class="delete-btn" type="button" data-action="delete" data-id="${patient._id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function fetchPatients() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) {
    params.set("search", searchInput.value.trim());
  }
  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  const response = await fetch(`/api/patients?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to fetch patients");
  }

  renderPatients(data);
}

async function savePatient(event) {
  event.preventDefault();

  const payload = getFormData();
  const endpoint = editingId ? `/api/patients/${editingId}` : "/api/patients";
  const method = editingId ? "PUT" : "POST";

  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to save patient");
  }

  showMessage(data.message || "Patient saved successfully.");
  resetForm();
  await fetchPatients();
}

async function deletePatient(id) {
  const confirmed = window.confirm("Delete this patient record?");
  if (!confirmed) {
    return;
  }

  const response = await fetch(`/api/patients/${id}`, {
    method: "DELETE"
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to delete patient");
  }

  showMessage(data.message || "Patient deleted successfully.");
  if (editingId === id) {
    resetForm();
  }
  await fetchPatients();
}

patientForm.addEventListener("submit", (event) => {
  savePatient(event).catch((error) => showMessage(error.message, true));
});

cancelEditButton.addEventListener("click", resetForm);

searchInput.addEventListener("input", () => {
  fetchPatients().catch((error) => showMessage(error.message, true));
});

statusFilter.addEventListener("change", () => {
  fetchPatients().catch((error) => showMessage(error.message, true));
});

function handleActionClick(event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const patient = patientCache.find((item) => item._id === id);

  if (action === "edit" && patient) {
    fillForm(patient);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete") {
    deletePatient(id).catch((error) => showMessage(error.message, true));
  }
}

patientTableBody.addEventListener("click", handleActionClick);
patientCardBoard.addEventListener("click", handleActionClick);

fetchPatients().catch((error) => showMessage(error.message, true));
