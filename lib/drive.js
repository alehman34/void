import { google } from "googleapis";

const FILE_NAME = "void-entries.json";
const MIME = "application/json";

function getAuth(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

async function findFile(drive) {
  const res = await drive.files.list({
    q: `name='${FILE_NAME}' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });
  return res.data.files?.[0]?.id || null;
}

export async function readEntries(accessToken) {
  const drive = google.drive({ version: "v3", auth: getAuth(accessToken) });
  const fileId = await findFile(drive);
  if (!fileId) return [];
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );
  try {
    return JSON.parse(res.data);
  } catch {
    return [];
  }
}

export async function writeEntries(accessToken, entries) {
  const drive = google.drive({ version: "v3", auth: getAuth(accessToken) });
  const body = JSON.stringify(entries, null, 2);
  const media = { mimeType: MIME, body };
  const fileId = await findFile(drive);
  if (fileId) {
    await drive.files.update({ fileId, media });
  } else {
    await drive.files.create({
      requestBody: { name: FILE_NAME, mimeType: MIME },
      media,
    });
  }
}
