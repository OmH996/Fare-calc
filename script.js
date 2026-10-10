'use strict';

const fareInput = document.getElementById('fareInput');
const paidInput = document.getElementById('paidInput');
const countInput = document.getElementById('countInput');
const paymentForm = document.getElementById('paymentForm');
const formMessage = document.getElementById('formMessage');
const resultsList = document.getElementById('resultsList');
const emptyState = document.getElementById('emptyState');
const clearButton = document.getElementById('clearButton');

const totalPeopleElement = document.getElementById('totalPeople');
const totalFareElement = document.getElementById('totalFare');
const totalPaidElement = document.getElementById('totalPaid');
const totalChangeElement = document.getElementById('totalChange');
const totalShortageElement = document.getElementById('totalShortage');

let groups = [];
let nextGroupId = 1;
const numberFormatter = new Intl.NumberFormat('ar-EG', {
  maximumFractionDigits: 2,
});

function readNumber(input) {
  return Number.parseFloat(input.value);
}

function money(value) {
  // Avoid displaying tiny floating-point leftovers such as 9.999999.
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return numberFormatter.format(rounded);
}

function getFare() {
  return readNumber(fareInput);
}

function showMessage(message, type = 'error') {
  formMessage.textContent = message;
  formMessage.className = `form-message show ${type}`;
}

function hideMessage() {
  formMessage.textContent = '';
  formMessage.className = 'form-message';
}

function validateInputs() {
  const fare = getFare();
  const paid = readNumber(paidInput);
  const count = Number.parseInt(countInput.value, 10);

  if (!Number.isFinite(fare) || fare <= 0) {
    showMessage('اكتب أجرة صحيحة أكبر من صفر.');
    fareInput.focus();
    return null;
  }

  if (!Number.isFinite(paid) || paid < 0) {
    showMessage('اكتب مبلغًا مدفوعًا صحيحًا، ولا يمكن أن يكون بالسالب.');
    paidInput.focus();
    return null;
  }

  if (!Number.isInteger(count) || count < 1) {
    showMessage('اكتب عدد أشخاص صحيحًا، ويكون واحدًا على الأقل.');
    countInput.focus();
    return null;
  }

  return { fare, paid, count };
}

paymentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = validateInputs();
  if (!values) return;

  const group = {
    id: nextGroupId++,
    paidPerPerson: values.paid,
    count: values.count,
  };
  groups.push(group);
  render();

  if (values.paid < values.fare) {
    showMessage(`تنبيه: المبلغ أقل من الأجرة بـ ${money(values.fare - values.paid)} جنيه لكل شخص في المجموعة دي.`, 'error');
  } else {
    showMessage('تمت إضافة المجموعة وحساب المبلغ بنجاح.', 'success');
  }

  countInput.value = '1';
  paidInput.focus();
  paidInput.select();
});

fareInput.addEventListener('input', () => {
  hideMessage();
  render();
});

clearButton.addEventListener('click', () => {
  if (groups.length === 0) {
    showMessage('مفيش مجموعات لمسحها.', 'error');
    return;
  }

  groups = [];
  render();
  showMessage('تم مسح كل المجموعات.', 'success');
});

function getTotals(fare) {
  return groups.reduce((totals, group) => {
    const groupFare = fare * group.count;
    const groupPaid = group.paidPerPerson * group.count;
    const changePerPerson = Math.max(group.paidPerPerson - fare, 0);
    const shortagePerPerson = Math.max(fare - group.paidPerPerson, 0);

    totals.people += group.count;
    totals.fare += groupFare;
    totals.paid += groupPaid;
    totals.change += changePerPerson * group.count;
    totals.shortage += shortagePerPerson * group.count;
    return totals;
  }, { people: 0, fare: 0, paid: 0, change: 0, shortage: 0 });
}

function createStat(label, value) {
  const stat = document.createElement('div');
  stat.className = 'result-stat';

  const statLabel = document.createElement('span');
  statLabel.textContent = label;
  const statValue = document.createElement('strong');
  statValue.textContent = value;

  stat.append(statLabel, statValue);
  return stat;
}

function renderGroup(group, index, fare) {
  const result = document.createElement('article');
  result.className = 'result-item';

  const top = document.createElement('div');
  top.className = 'result-top';

  const titleBox = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'result-name';
  title.textContent = `المجموعة ${numberFormatter.format(index + 1)}`;
  const subtitle = document.createElement('p');
  subtitle.className = 'result-subtitle';
  subtitle.textContent = `${numberFormatter.format(group.count)} ${group.count === 1 ? 'شخص' : 'أشخاص'} × ${money(group.paidPerPerson)} جنيه`;
  titleBox.append(title, subtitle);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button';
  deleteButton.textContent = 'حذف المجموعة';
  deleteButton.setAttribute('aria-label', `حذف المجموعة ${index + 1}`);
  deleteButton.addEventListener('click', () => {
    groups = groups.filter((item) => item.id !== group.id);
    render();
    showMessage('تم حذف المجموعة وتحديث الحسابات.', 'success');
  });
  top.append(titleBox, deleteButton);

  const totalFareForGroup = fare * group.count;
  const totalPaidForGroup = group.paidPerPerson * group.count;
  const perPersonDifference = Math.abs(group.paidPerPerson - fare);
  const differenceForGroup = perPersonDifference * group.count;

  const stats = document.createElement('div');
  stats.className = 'result-stats';
  stats.append(
    createStat('الأجرة المطلوبة للمجموعة', `${money(totalFareForGroup)} ج`),
    createStat('إجمالي المدفوع', `${money(totalPaidForGroup)} ج`),
    createStat('الباقي', `${money(differenceForGroup)} ج`),
  );

  const status = document.createElement('div');
  status.className = 'result-status';
  if (!Number.isFinite(fare) || fare <= 0) {
    status.classList.add('exact');
    status.textContent = 'اكتب أجرة صحيحة أكبر من صفر عشان نقدر نحسب الباقي أو المبلغ الناقص.';
  } else if (group.paidPerPerson > fare) {
    status.classList.add('change');
    status.textContent = `الباقي لكل شخص: ${money(group.paidPerPerson - fare)} جنيه — إجمالي الباقي للمجموعة: ${money(differenceForGroup)} جنيه.`;
  } else if (group.paidPerPerson < fare) {
    status.classList.add('shortage');
    status.textContent = `المبلغ أقل! الناقص من كل شخص: ${money(fare - group.paidPerPerson)} جنيه — إجمالي الناقص للمجموعة: ${money(differenceForGroup)} جنيه.`;
  } else {
    status.classList.add('exact');
    status.textContent = 'المبلغ مضبوط، مفيش باقي ولا مبلغ ناقص.';
  }

  result.append(top, stats, status);
  return result;
}

function render() {
  const fare = getFare();
  const validFare = Number.isFinite(fare) && fare > 0;
  const totals = getTotals(validFare ? fare : 0);

  totalPeopleElement.textContent = numberFormatter.format(totals.people);
  totalFareElement.textContent = validFare ? money(totals.fare) : '—';
  totalPaidElement.textContent = money(totals.paid);
  totalChangeElement.textContent = validFare ? money(totals.change) : '—';
  totalShortageElement.textContent = validFare ? money(totals.shortage) : '—';

  resultsList.replaceChildren();
  emptyState.style.display = groups.length === 0 ? 'block' : 'none';

  groups.forEach((group, index) => {
    resultsList.appendChild(renderGroup(group, index, validFare ? fare : Number.NaN));
  });
}

render();
