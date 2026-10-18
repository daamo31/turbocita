import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { money } from "@/lib/utils";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";

export type PdfData = {
  business: { name: string; tax_id: string | null; address: string | null; phone: string | null; email: string | null; currency: string };
  client: { name: string; phone: string; email: string | null } | null;
  doc: { type: "quote" | "invoice"; number: number; status: "pending" | "paid" | "cancelled"; issue_date: string; due_date: string | null; tax_rate: number; notes: string | null };
  items: { description: string; quantity: number; unit_price: number }[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  bold: { fontFamily: "Helvetica-Bold" },
  thead: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 4, marginTop: 24, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderColor: "#ccc" },
  cDesc: { flex: 5 }, cQty: { flex: 1, textAlign: "right" }, cPrice: { flex: 2, textAlign: "right" }, cTotal: { flex: 2, textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 200 },
});

export function DocumentPdf({ business, client, doc, items }: PdfData) {
  const cur = business.currency;
  const sub = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const tax = sub * (doc.tax_rate / 100);
  return (
    <Document title={`${TYPE_LABEL[doc.type]} ${doc.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.h1}>{TYPE_LABEL[doc.type].toUpperCase()} #{doc.number}</Text>
            <Text>Fecha: {doc.issue_date}{doc.due_date ? `  ·  Vence: ${doc.due_date}` : ""}</Text>
            <Text>Estado: {STATUS_LABEL[doc.status]}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.bold}>{business.name}</Text>
            {business.tax_id && <Text>{business.tax_id}</Text>}
            {business.address && <Text>{business.address}</Text>}
            {business.phone && <Text>{business.phone}</Text>}
            {business.email && <Text>{business.email}</Text>}
          </View>
        </View>
        {client && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.bold}>Cliente</Text>
            <Text>{client.name}</Text><Text>{client.phone}</Text>{client.email && <Text>{client.email}</Text>}
          </View>
        )}
        <View style={s.thead}>
          <Text style={s.cDesc}>Descripción</Text><Text style={s.cQty}>Cant.</Text>
          <Text style={s.cPrice}>Precio</Text><Text style={s.cTotal}>Importe</Text>
        </View>
        {items.map((i, k) => (
          <View key={k} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{i.description}</Text><Text style={s.cQty}>{i.quantity}</Text>
            <Text style={s.cPrice}>{money(i.unit_price, cur)}</Text><Text style={s.cTotal}>{money(i.quantity * i.unit_price, cur)}</Text>
          </View>
        ))}
        <View style={s.totals}>
          <View style={s.row}><Text>Subtotal</Text><Text>{money(sub, cur)}</Text></View>
          <View style={s.row}><Text>IVA ({doc.tax_rate}%)</Text><Text>{money(tax, cur)}</Text></View>
          <View style={[s.row, s.bold, { marginTop: 4, fontSize: 12 }]}><Text>Total</Text><Text>{money(sub + tax, cur)}</Text></View>
        </View>
        {doc.notes && <Text style={{ marginTop: 24 }}>{doc.notes}</Text>}
      </Page>
    </Document>
  );
}
