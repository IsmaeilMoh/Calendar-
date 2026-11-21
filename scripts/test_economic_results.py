import unittest
from datetime import datetime, timezone
from economic_results_core import parse_numeric, surprise, ingest, stable_id
from ff_web_calendar import parse_html
from datetime import date

NOW = datetime(2026, 11, 24, 15, tzinfo=timezone.utc)
HTML = '''<table class="calendar__table"><tbody>
<tr class="calendar__row" data-event-id="12345"><td class="calendar__date">Mon Nov 23</td><td class="calendar__time">13:30</td><td class="calendar__currency">USD</td><td class="calendar__impact"><span class="icon--ff-impact-red"></span></td><td class="calendar__event"><span class="calendar__event-title">CPI m/m</span></td><td class="calendar__actual">0.4%</td><td class="calendar__forecast">0.3%</td><td class="calendar__previous">0.2%</td></tr>
<tr class="calendar__row"><td class="calendar__date">Tue Nov 24</td><td class="calendar__time">14:00</td><td class="calendar__currency">EUR</td><td class="calendar__event">Awaiting Release</td><td class="calendar__actual">—</td><td class="calendar__forecast">10K</td></tr>
</tbody></table>'''

class TestResults(unittest.TestCase):
    def test_numeric_units(self):
        self.assertEqual(parse_numeric('1.2M')[0], 1200000)
        self.assertEqual(parse_numeric('-12K')[0], -12000)
        self.assertEqual(parse_numeric('0%')[0], 0)
        self.assertIsNone(parse_numeric('1.2 / 3.4'))
        self.assertIsNone(parse_numeric('—'))
    def test_percent_surprise(self):
        self.assertEqual(surprise('0.4%', '0.3%')['difference'], '0.1')
        self.assertEqual(surprise('0.4%', '0.3%')['unit'], 'percentage-points')
    def test_no_mismatched_unit(self):
        self.assertFalse(surprise('50%', '50K')['comparable'])
    def test_zero_is_valid(self):
        self.assertTrue(surprise('0', '0')['comparable'])
    def test_only_released(self):
        parsed = parse_html(HTML,date(2026,11,23))
        data, stats = ingest(parsed,now=NOW)
        self.assertEqual(len(data),1)
        self.assertEqual(data[0]['values']['actual'],'0.4%')
        self.assertEqual(stats['newOrRevised'],1)
    def test_revision_history(self):
        record={'date':'2026-11-23T13:30:00Z','country':'USD','title':'CPI m/m','actual':'0.4%', 'forecast':'0.3%','previous':'0.2%','ffEventId':'12345'}
        old, _=ingest([record],now=NOW)
        newer=dict(record,actual='0.5%')
        new, stats=ingest([newer],old,now=NOW)
        self.assertEqual(stats['newOrRevised'],1)
        self.assertEqual(len(new[0]['revisions']),1)
        self.assertEqual(new[0]['revisions'][0]['previousValues']['actual'],'0.4%')
    def test_id_stable(self):
        e={'date':'2026-11-23T13:30:00Z','country':'USD','title':'CPI m/m'}
        self.assertEqual(stable_id(e),stable_id(dict(e,date='2026-11-23T15:30:00Z')))
    def test_future_rejected(self):
        event={'date':'2026-11-25T13:30:00Z','country':'USD','title':'Future','actual':'1.0%'}
        result,_=ingest([event],now=NOW)
        self.assertEqual(result,[])
    def test_absent_forecast_keeps_actual(self):
        event={'date':'2026-11-23T13:30:00Z','country':'USD','title':'Release','actual':'123K','forecast':'—'}
        result,_=ingest([event],now=NOW)
        self.assertFalse(result[0]['comparison']['comparable'])

if __name__=='__main__': unittest.main()
