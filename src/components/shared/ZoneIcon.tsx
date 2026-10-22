import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBasketShopping,
  faCookieBite,
  faAppleWhole,
  faSnowflake,
  faGlassWater,
  faWarehouse,
  faHouse,
  faHeart,
  faBaby,
  faPaw,
  faBreadSlice,
  faCreditCard,
  faShirt,
  faTv,
  faBox,
} from "@fortawesome/free-solid-svg-icons";

config.autoAddCss = false;

const zoneIcons: Record<string, IconDefinition> = {
  A: faBasketShopping,
  B: faCookieBite,
  C: faAppleWhole,
  D: faSnowflake,
  E: faGlassWater,
  F: faWarehouse,
  G: faHouse,
  H: faHeart,
  I: faBaby,
  J: faPaw,
  K: faBreadSlice,
  L: faCreditCard,
  M: faShirt,
  N: faTv,
};

export function ZoneIcon({
  zoneId,
  size = 19,
}: {
  zoneId: string;
  size?: number;
}) {
  return (
    <FontAwesomeIcon
      icon={zoneIcons[zoneId] ?? faBox}
      data-zone-icon={zoneId}
      aria-hidden="true"
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}
