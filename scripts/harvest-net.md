🎯 **Filtrer la requête Resource Graph sur un *seul* Resource Group**

> 💡 Le champ s’appelle `resourceGroup` dans Resource Graph.
> Il suffit de l’ajouter dans le `where` juste après `Resources`.

---

### 📋 Copier-coller tel quel dans **Cloud Shell – Bash**

```bash
# ---- À PERSONNALISER ----
RG="BDT-BOTPLU-RC-RG-01"         # 🔁   remplace par le nom de ton RG
OUT="${RG}-graph-network.json"   #     nom du fichier de sortie
# --------------------------

az graph query -q "
Resources
| where resourceGroup == '${RG}'
| where type !contains 'providers/diagnosticSettings'
| extend vnetId = tostring(properties.virtualNetworkSubnetId),
        pe      = properties.networkProfile.privateEndpointConnections,
        ipConfs = properties.ipConfigurations
| where vnetId != '' or array_length(pe) > 0 or array_length(ipConfs) > 0
| project id, name, type, location, tags, vnetId, pe, ipConfs, properties
" -o json > \"${OUT}\"

echo \"✅  Fichier créé : ${OUT}\"
```

\*— Le double-quoted `"` permet au Bash de substituer `$RG` sans casser le Kusto.
*— Remplace simplement la valeur de `RG` avant d’appuyer sur Entrée.*

---

### 📥 Récupérer le fichier depuis Cloud Shell

1. Dans le panneau Cloud Shell, clique sur le **bouton ⋯ (ellipses)** à droite du fichier devenu visible.
2. Sélectionne **Download** → il atterrit sur ton poste.

*(Ou bien `azcopy`, `scp`, etc., si tu préfères.)*

---
