type FingerprintAutomationInput = {
  baseUrl: string;
  username: string;
  password: string;
  employeeNumber: string;
};

type AutomationResult = {
  ok: boolean;
  message: string;
  editUrl?: string;
};

type ServerFunctionCall = {
  data: FingerprintAutomationInput;
};

export async function startHikvisionFingerprintAutomation({
  data,
}: ServerFunctionCall): Promise<AutomationResult> {
  const baseUrl = data.baseUrl.replace(/\/$/, "");
  const employeeNumber = data.employeeNumber.trim().toUpperCase();
  return {
    ok: false,
    editUrl: `${baseUrl}/doc/index.html#/peopleManage/addEditPeople?employeeNo=${encodeURIComponent(
      employeeNumber,
    )}&pageNumber=1&groupPageNumber=1&viewMode=card&currentGroupId=all&type=edit`,
    message:
      "Automatic fingerprint workflow is available only on the local Windows sync machine. Use Open Terminal, or run the local Hikvision helper near the device.",
  };
}
