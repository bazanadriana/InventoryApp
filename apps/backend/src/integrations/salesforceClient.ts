import { Connection } from 'jsforce';

const {
  SF_LOGIN_URL = 'https://login.salesforce.com',
  SF_USERNAME,
  SF_PASSWORD,
  SF_SECURITY_TOKEN,
} = process.env;

if (!SF_USERNAME || !SF_PASSWORD || !SF_SECURITY_TOKEN) {
  console.warn(
    '[salesforce] Missing SF credentials. Set SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN.'
  );
}

let cached: Connection | null = null;

export async function getSfConn(): Promise<Connection> {
  if (cached) return cached;
  const conn = new Connection({ loginUrl: SF_LOGIN_URL });

  // IMPORTANT: password + security token appended
  await conn.login(SF_USERNAME!, `${SF_PASSWORD!}${SF_SECURITY_TOKEN!}`);

  cached = conn;
  return conn;
}

// Minimal result shape that jsforce returns for create/update
type JsforceResult = { id?: string; success: boolean; errors?: any[] };

/** Upsert (by Name) a simple Account. Returns Account Id. */
export async function upsertAccountByName(name: string, phone?: string): Promise<string> {
  const conn = await getSfConn();

  const existing = await conn
    .sobject('Account')
    .find<{ Id: string }>({ Name: name }, 'Id')
    .limit(1)
    .execute();

  if (existing.length) return existing[0].Id;

  const res = (await conn.sobject('Account').create({
    Name: name,
    Phone: phone ?? undefined,
    Type: 'Customer',
  })) as JsforceResult;

  if (!res.success || !res.id) {
    throw new Error(`Account create failed: ${JSON.stringify(res)}`);
  }
  return res.id;
}

/** Upsert Contact by Email; link to AccountId. Returns Contact Id. */
export async function upsertContactByEmail(
  email: string,
  accountId: string,
  fields: { FirstName?: string; LastName?: string; Title?: string; Phone?: string }
): Promise<string> {
  const conn = await getSfConn();

  const existing = await conn
    .sobject('Contact')
    .find<{ Id: string }>({ Email: email }, 'Id')
    .limit(1)
    .execute();

  if (existing.length) {
    const contactId = existing[0].Id;
    const res = (await conn.sobject('Contact').update({
      Id: contactId,
      AccountId: accountId,
      ...fields,
      Email: email,
    })) as JsforceResult;

    if (!res.success) throw new Error(`Contact update failed: ${JSON.stringify(res)}`);
    return contactId;
  }

  const res = (await conn.sobject('Contact').create({
    AccountId: accountId,
    Email: email,
    ...fields,
  })) as JsforceResult;

  if (!res.success || !res.id) {
    throw new Error(`Contact create failed: ${JSON.stringify(res)}`);
  }
  return res.id;
}
