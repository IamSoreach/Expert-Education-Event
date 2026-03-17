import { Prisma } from "@prisma/client";
import { ConfirmationStatus, RegistrationStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { isStaffRequestAuthorized } from "@/lib/auth";
import { formatDateTimePhnomPenh } from "@/lib/datetime";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { reconcileConfirmationStatuses } from "@/server/confirmation-reconcile";

const STATUS_OPTIONS = new Set(Object.values(RegistrationStatus));
const CONFIRMATION_OPTIONS = new Set(Object.values(ConfirmationStatus));
const EXCEL_MIME_TYPE = "application/vnd.ms-excel; charset=utf-8";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createCell(value: string, styleId = "Data"): string {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function createRow(values: string[], styleId = "Data"): string {
  return `<Row>${values.map((value) => createCell(value, styleId)).join("")}</Row>`;
}

function toDateTime(value: Date | null): string {
  return formatDateTimePhnomPenh(value);
}

function buildFilename(): string {
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `staff-registrations-${stamp}.xls`;
}

function buildWhere(searchParams: URLSearchParams): Prisma.RegistrationWhereInput {
  const eventFilter = searchParams.get("event")?.trim() || "";
  const searchText = searchParams.get("q")?.trim() || "";
  const rawStatus = searchParams.get("status")?.trim() || "";
  const rawConfirmation = searchParams.get("confirmation")?.trim() || "";
  const statusFilter = STATUS_OPTIONS.has(rawStatus as RegistrationStatus)
    ? (rawStatus as RegistrationStatus)
    : undefined;
  const confirmationFilter = CONFIRMATION_OPTIONS.has(rawConfirmation as ConfirmationStatus)
    ? (rawConfirmation as ConfirmationStatus)
    : undefined;

  const whereBase: Prisma.RegistrationWhereInput = {};

  if (eventFilter) {
    whereBase.event = {
      code: eventFilter,
    };
  }

  if (searchText) {
    whereBase.OR = [
      {
        participant: {
          fullName: {
            contains: searchText,
          },
        },
      },
      {
        participant: {
          phoneNumber: {
            contains: searchText,
          },
        },
      },
      {
        participant: {
          email: {
            contains: searchText,
          },
        },
      },
      {
        event: {
          name: {
            contains: searchText,
          },
        },
      },
      {
        event: {
          code: {
            contains: searchText,
          },
        },
      },
      {
        ticket: {
          ticketCode: {
            contains: searchText,
          },
        },
      },
    ];
  }

  return {
    ...whereBase,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(confirmationFilter ? { confirmationStatus: confirmationFilter } : {}),
  };
}

function buildWorkbook(rows: string[][]): string {
  const headerRow = createRow(
    [
      "Submitted (Phnom Penh GMT+7)",
      "Event",
      "Event Code",
      "Participant",
      "Phone Number",
      "Email",
      "Organization",
      "Telegram Username",
      "Registration Status",
      "Confirmation Status",
      "Confirmation Sent At",
      "Ticket Code",
      "Ticket Sent At",
      "Checked In At",
    ],
    "Header",
  );

  const bodyRows = rows.map((row) => createRow(row)).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40"
>
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#DDF7F5" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Data"/>
  </Styles>
  <Worksheet ss:Name="Registrations">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const env = getEnv();
  if (!isStaffRequestAuthorized(req, env.STAFF_AUTH_SECRET)) {
    return new Response("Unauthorized.", { status: 401 });
  }

  await reconcileConfirmationStatuses();

  const where = buildWhere(req.nextUrl.searchParams);
  const registrations = await prisma.registration.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      event: {
        select: {
          name: true,
          code: true,
        },
      },
      participant: {
        select: {
          fullName: true,
          phoneNumber: true,
          email: true,
          organization: true,
          telegramUsername: true,
        },
      },
      ticket: {
        select: {
          ticketCode: true,
          sentAt: true,
          checkedInAt: true,
        },
      },
    },
  });

  const rows = registrations.map((row) => [
    toDateTime(row.createdAt),
    row.event.name,
    row.event.code,
    row.participant.fullName,
    row.participant.phoneNumber,
    row.participant.email || "-",
    row.participant.organization || "-",
    row.participant.telegramUsername || "-",
    row.status,
    row.confirmationStatus,
    toDateTime(row.confirmationSentAt ?? null),
    row.ticket?.ticketCode || "-",
    toDateTime(row.ticket?.sentAt ?? null),
    toDateTime(row.ticket?.checkedInAt ?? null),
  ]);

  const workbook = buildWorkbook(rows);

  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": EXCEL_MIME_TYPE,
      "Content-Disposition": `attachment; filename="${buildFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
