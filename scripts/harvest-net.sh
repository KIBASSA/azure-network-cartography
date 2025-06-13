#!/usr/bin/env bash
# =============================================================================
# Azure RG Network Harvester
# -----------------------------------------------------------------------------
# Collecte un instantané JSON très complet de toutes les ressources réseau
# (et proches) d’un Resource Group Azure.
#
# Usage  : ./harvest-net.sh <RESOURCE_GROUP> [OUTPUT_FILE]
# Exemple: ./harvest-net.sh BDT-BOTPLU-RC-RG-01 scan.json
# =============================================================================
set -euo pipefail

RG_NAME="${1:-}"
OUT_FILE="${2:-${RG_NAME}-network-scan-$(date +%Y%m%dT%H%M%S).json}"

if [[ -z "$RG_NAME" ]]; then
  echo "❌ Oups ! Tu dois fournir le nom du Resource Group en 1ᵉʳ paramètre." >&2
  exit 1
fi

echo "🔍 Scanning Resource Group : $RG_NAME"
tmpdir="$(mktemp -d)"

###############################################################################
# 1. VNets, subnets & peerings
###############################################################################
echo "  • VNets..."
az network vnet list -g "$RG_NAME" -o json >"$tmpdir/vnets.json"

echo "  • Subnets + peerings..."
jq -r '.[].name' "$tmpdir/vnets.json" | while read -r vnet; do
  az network vnet subnet   list -g "$RG_NAME" --vnet-name "$vnet" -o json \
    >"$tmpdir/subnet-$vnet.json"
  az network vnet peering  list -g "$RG_NAME" --vnet-name "$vnet" -o json \
    >"$tmpdir/peering-$vnet.json"
done

###############################################################################
# 2. Private Endpoints & Private Link Services
###############################################################################
echo "  • Private Endpoints..."
az network private-endpoint       list -g "$RG_NAME" -o json >"$tmpdir/pe.json"
echo "  • Private Link Services..."
az network private-link-service   list -g "$RG_NAME" -o json >"$tmpdir/pls.json"

###############################################################################
# 3. Sécurité, routage & grosses briques réseau
###############################################################################
echo "  • Network Security Groups..."
az network nsg          list -g "$RG_NAME" -o json >"$tmpdir/nsg.json"
echo "  • Route Tables (UDR)..."
az network route-table  list -g "$RG_NAME" -o json >"$tmpdir/udr.json"

echo "  • DDoS Protection Plans..."
az network ddos-protection       list -g "$RG_NAME" -o json >"$tmpdir/ddos.json"

echo "  • Application Gateways..."
az network application-gateway   list -g "$RG_NAME" -o json >"$tmpdir/appgw.json"

echo "  • Load Balancers..."
az network lb                    list -g "$RG_NAME" -o json >"$tmpdir/lb.json"

###############################################################################
# 4. Interfaces, IP publiques & compute
###############################################################################
echo "  • Network Interfaces..."
az network nic       list -g "$RG_NAME" -o json >"$tmpdir/nic.json"
echo "  • Public IPs..."
az network public-ip list -g "$RG_NAME" -o json >"$tmpdir/pip.json"

echo "  • Virtual Machines..."
az vm list -g "$RG_NAME" --show-details -o json >"$tmpdir/vm.json"

###############################################################################
# 5. Fusion JSON
###############################################################################
echo "  • Fusion des résultats..."
jq -n \
  --slurpfile vnet   "$tmpdir/vnets.json" \
  --slurpfile subnet "$tmpdir"/subnet-*.json \
  --slurpfile peer   "$tmpdir"/peering-*.json \
  --slurpfile pe     "$tmpdir/pe.json" \
  --slurpfile pls    "$tmpdir/pls.json" \
  --slurpfile nsg    "$tmpdir/nsg.json" \
  --slurpfile udr    "$tmpdir/udr.json" \
  --slurpfile ddos   "$tmpdir/ddos.json" \
  --slurpfile appgw  "$tmpdir/appgw.json" \
  --slurpfile lb     "$tmpdir/lb.json" \
  --slurpfile nic    "$tmpdir/nic.json" \
  --slurpfile pip    "$tmpdir/pip.json" \
  --slurpfile vm     "$tmpdir/vm.json" \
  '{
     collected_at:          now|strftime("%Y-%m-%dT%H:%M:%SZ"),
     resource_group:        "'"$RG_NAME"'",
     vnets:                 $vnet[0],
     subnets:               $subnet|add,
     peerings:              $peer|add,
     private_endpoints:     $pe[0],
     private_link_services: $pls[0],
     network_security_groups:$nsg[0],
     route_tables:          $udr[0],
     ddos_plans:            $ddos[0],
     application_gateways:  $appgw[0],
     load_balancers:        $lb[0],
     nics:                  $nic[0],
     public_ips:            $pip[0],
     virtual_machines:      $vm[0]
   }' >"$OUT_FILE"

echo "✅ Terminé ! Fichier produit : $OUT_FILE"
echo "   (Tu peux jeter un œil : cat $OUT_FILE | jq '.')"

###############################################################################
# 6. Nettoyage
###############################################################################
rm -rf "$tmpdir"
