import unittest
from datetime import date
from unittest.mock import patch, Mock
from ff_web_calendar import parse_html, fetch_week, week_url

HTML = '''<html><table class="calendar__table"><tbody>
<tr class="calendar__row"><td class="calendar__date"><span>Mon Nov 23</span></td><td class="calendar__time"><span>13:30</span></td><td class="calendar__currency"><span>USD</span></td><td class="calendar__impact"><span class="icon--ff-impact-red"></span></td><td class="calendar__event"><span class="calendar__event-title">US Test Release</span></td><td class="calendar__forecast"><span>3.2%</span></td><td class="calendar__previous"><span>3.1%</span></td></tr>
<tr class="calendar__row"><td class="calendar__date"></td><td class="calendar__time"></td><td class="calendar__currency"><span>EUR</span></td><td class="calendar__impact"><span class="icon--ff-impact-ora"></span></td><td class="calendar__event"><span class="calendar__event-title">Euro Test</span></td></tr>
<tr class="calendar__row"><td class="calendar__date"></td><td class="calendar__time">Tentative</td><td class="calendar__currency">USD</td><td class="calendar__event">Unknown Time</td></tr>
</tbody></table></html>'''
class Tests(unittest.TestCase):
    def test_parse(self):
        records = parse_html(HTML, date(2026,11,23))
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]['source'] if 'source' in records[0] else records[0]['country'],'USD')
        self.assertEqual(records[0]['impact'], 'High')
        self.assertEqual(records[1]['impact'], 'Medium')
        self.assertEqual(records[0]['date'], '2026-11-23T13:30:00Z')
    def test_reject_wrong_week(self):
        with self.assertRaises(ValueError):
            parse_html(HTML, date(2026,11,30))
    def test_blocked(self):
        with self.assertRaises(ValueError):
            parse_html('<html>Access denied</html>', date(2026,11,23))
    def test_url(self):
        self.assertEqual(week_url(date(2026,11,23)), 'https://www.forexfactory.com/calendar?week=nov23.2026')
    @patch('ff_web_calendar.requests.get')
    def test_request(self, get):
        get.return_value = Mock(text=HTML, status_code=200)
        records,url=fetch_week(date(2026,11,23))
        self.assertEqual(len(records),2)
        self.assertEqual(get.call_args.kwargs['cookies']['fftimezone'],'Etc/GMT')
if __name__ == '__main__': unittest.main()
