/*
  This file is part of opq-tools.

  opq-tools is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  opq-tools is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with opq-tools. If not, see <http://www.gnu.org/licenses/>.

  Copyright 2014 Anthony Christe
*/

package tests;

import org.junit.Before;
import org.junit.Test;
import org.openpowerquality.protocol.OpqPacket;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class OpqPacketTests {
  private OpqPacket opqPacket;

  @Before
  public void setup() {
    this.opqPacket = new OpqPacket();
  }

  @Test
  public void testEmptyConstructor() {
    assertEquals(opqPacket.getHeader(), 0x00C0FFEE);
    assertEquals(opqPacket.getData().length, OpqPacket.PACKET_SIZE);
  }

  @Test
  public void testHeader() {
    assertEquals(opqPacket.getHeader(), 0x00C0FFEE);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.HEADER), new byte[]{0x00, (byte)0xC0, (byte)0xFF, (byte)0xEE});
  }

  @Test
  public void testType() {
    opqPacket.setType(3);
    assertEquals(opqPacket.getType(), 3);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.TYPE), new byte[]{0x00, 0x00, 0x00, 0x03});
  }

  @Test
  public void testSequenceNumber() {
    opqPacket.setSequenceNumber(305419947);
    assertEquals(opqPacket.getSequenceNumber(), 305419947);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.SEQUENCE_NUMBER), new byte[]{0x12, 0x34, 0x56, (byte) 0xAB});
  }

  @Test
  public void testDeviceId() {
    opqPacket.setDeviceId(1311768465173141112L);
    assertEquals(opqPacket.getDeviceId(), 1311768465173141112L);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.DEVICE_ID), new byte[]{0x12, 0x34, 0x56, 0x78, 0x12, 0x34, 0x56, 0x78});
  }

  @Test
  public void testTimestamp() {
    opqPacket.setTimestamp(1311768465173141112L);
    assertEquals(opqPacket.getTimestamp(), 1311768465173141112L);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.TIMESTAMP), new byte[]{0x12, 0x34, 0x56, 0x78, 0x12, 0x34, 0x56, 0x78});
  }

  @Test
  public void testBitfield() {
    opqPacket.setBitfield(305419896);
    assertEquals(opqPacket.getBitfield(), 305419896);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.BITFIELD), new byte[]{0x12, 0x34, 0x56, 0x78});
  }

  @Test
  public void testPayload() {
    byte[] payload = {0x01, 0x02, 0x03, 0x04};
    opqPacket.setPayload(payload);
    assertEquals(opqPacket.getData().length, OpqPacket.PACKET_SIZE + payload.length);
    assertArrayEquals(opqPacket.getPayload(), payload);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.PAYLOAD), payload);
    assertEquals(opqPacket.getPayloadSize(), 4);
    assertArrayEquals(opqPacket.getDataPart(OpqPacket.Protocol.PAYLOAD_SIZE), new byte[]{0x00, 0x00, 0x00, 0x04});
  }

  @Test
  public void testMeasurementVoltage() {
    opqPacket.setMeasurement(0, 1.1234);
    assertEquals(opqPacket.getVoltage(), 1.1234, 0.001);
  }

  @Test
  public void testMeasurementFrequency() {
    opqPacket.setMeasurement(1.1234, 0);
    assertEquals(opqPacket.getFrequency(), 1.1234, 0.001);
  }

  @Test
  public void testMeasurementAlert() {
    opqPacket.setAlertValue(1.1234);
    assertEquals(opqPacket.getAlertValue(), 1.1234, 0.001);
  }

  // Fix this, issues with overflows and not having a signed type in Java.
  /**
  @Test
  public void testChecksumOnEmpty() {
    byte[] data = opqPacket.getData();
    int total = data[0] + data[1] + data[2] + data[3];
    opqPacket.setChecksum();
    assertEquals(opqPacket.getChecksum(), total);
    System.out.println(total);

  }
  */

  @Test
  public void testCompareToEquals() {
    OpqPacket other = new OpqPacket();
    opqPacket.setTimestamp(1);
    other.setTimestamp(1);
    assertEquals(opqPacket.compareTo(other), 0);
  }

  @Test
  public void testCompareToGreaterThan() {
    OpqPacket other = new OpqPacket();
    opqPacket.setTimestamp(10);
    other.setTimestamp(1);
    assertTrue(opqPacket.compareTo(other) > 0);
  }

  @Test
  public void testCompareToLessThan() {
    OpqPacket other = new OpqPacket();
    opqPacket.setTimestamp(1);
    other.setTimestamp(10);
    assertTrue(opqPacket.compareTo(other) < 0);
  }

  @Test
  public void testEqualsReflexive() {
    assertTrue(opqPacket.equals(opqPacket));
  }

  @Test
  public void testEqualsSymmetric() {
    OpqPacket other = new OpqPacket();
    assertTrue(opqPacket.equals(other));
    assertTrue(other.equals(opqPacket));
  }

  @Test
  public void testEqualsTransitcdive() {
    OpqPacket otherA = new OpqPacket();
    OpqPacket otherB = new OpqPacket();
    assertTrue(opqPacket.equals(otherA));
    assertTrue(otherA.equals(otherB));
    assertTrue(opqPacket.equals(otherB));
  }

  @Test
  public void testHashCodeConsistent() {
    assertEquals(opqPacket.hashCode(), opqPacket.hashCode());
  }

  @Test
  public void testHashCodeEquals() {
    OpqPacket other = new OpqPacket();
    assertTrue(opqPacket.equals(other));
    assertEquals(opqPacket.hashCode(), other.hashCode());
  }

}
