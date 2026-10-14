import journal from './meta/_journal.json';
import m0000 from './0000_military_mathemanic.sql';
import m0001 from './0001_lucky_marvex.sql';
import m0002 from './0002_repair_unit_cost_backfill.sql';
import m0003 from './0003_chief_wild_pack.sql';
import m0004 from './0004_green_ikaris.sql';
import m0005 from './0005_tough_drax.sql';
import m0006 from './0006_salty_kang.sql';
import m0007 from './0007_backfill_legacy_sale_payments.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007
    }
  }
  